import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { BaseMessage } from '@langchain/core/messages'
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  type StoredMessage,
} from '@langchain/core/messages'
import type { EmotionGardenSnapshot } from '../agentTools.js'

/** 单个会话的完整状态：对话历史、（预留）摘要、情绪快照、生命周期时间戳 */
export interface SessionRecord {
  sessionId: string
  messages: BaseMessage[]
  summary?: string
  emotionSnapshot?: EmotionGardenSnapshot
  createdAt: number
  updatedAt: number
  expiryTime: number
}

export interface SessionStore {
  get(sessionId: string): Promise<SessionRecord | null>
  set(record: SessionRecord): Promise<void>
  delete(sessionId: string): Promise<void>
  /** 清理已过期的会话，返回被清理的数量 */
  purgeExpired(now?: number): Promise<number>
  close(): void
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function nowMs(): number {
  return Date.now()
}

/**
 * 基于 better-sqlite3 的会话存储实现。
 * 单文件数据库，默认写在 server/data/sessions.sqlite3，随进程重启数据不丢失。
 */
export class SqliteSessionStore implements SessionStore {
  private db: Database.Database

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? defaultDbPath()
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
    this.db = new Database(resolvedPath)
    this.db.pragma('journal_mode = WAL')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id       TEXT PRIMARY KEY,
        messages         TEXT NOT NULL,
        summary          TEXT,
        emotion_snapshot TEXT,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        expiry_time      INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expiry_time);
    `)
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const row = this.db
      .prepare(
        `SELECT session_id, messages, summary, emotion_snapshot, created_at, updated_at, expiry_time
         FROM sessions WHERE session_id = ?`,
      )
      .get(sessionId) as
      | {
          session_id: string
          messages: string
          summary: string | null
          emotion_snapshot: string | null
          created_at: number
          updated_at: number
          expiry_time: number
        }
      | undefined

    if (!row) return null

    // 已过期的记录视为不存在，调用方会当作全新会话处理
    if (row.expiry_time < nowMs()) {
      return null
    }

    const stored = JSON.parse(row.messages) as StoredMessage[]
    return {
      sessionId: row.session_id,
      messages: mapStoredMessagesToChatMessages(stored),
      summary: row.summary ?? undefined,
      emotionSnapshot: row.emotion_snapshot
        ? (JSON.parse(row.emotion_snapshot) as EmotionGardenSnapshot)
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiryTime: row.expiry_time,
    }
  }

  async set(record: SessionRecord): Promise<void> {
    const stored = mapChatMessagesToStoredMessages(record.messages)
    this.db
      .prepare(
        `INSERT INTO sessions (session_id, messages, summary, emotion_snapshot, created_at, updated_at, expiry_time)
         VALUES (@sessionId, @messages, @summary, @emotionSnapshot, @createdAt, @updatedAt, @expiryTime)
         ON CONFLICT(session_id) DO UPDATE SET
           messages = excluded.messages,
           summary = excluded.summary,
           emotion_snapshot = excluded.emotion_snapshot,
           updated_at = excluded.updated_at,
           expiry_time = excluded.expiry_time`,
      )
      .run({
        sessionId: record.sessionId,
        messages: JSON.stringify(stored),
        summary: record.summary ?? null,
        emotionSnapshot: record.emotionSnapshot ? JSON.stringify(record.emotionSnapshot) : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        expiryTime: record.expiryTime,
      })
  }

  async delete(sessionId: string): Promise<void> {
    this.db.prepare(`DELETE FROM sessions WHERE session_id = ?`).run(sessionId)
  }

  async purgeExpired(now: number = nowMs()): Promise<number> {
    const info = this.db.prepare(`DELETE FROM sessions WHERE expiry_time < ?`).run(now)
    return info.changes
  }

  close(): void {
    this.db.close()
  }
}

function defaultDbPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  // server/src/memory -> server/data
  const dataDir = path.resolve(here, '../../data')
  return path.join(dataDir, 'sessions.sqlite3')
}

/** 创建一条新的会话记录（默认 24 小时过期，与原 session/start 逻辑保持一致） */
export function createSessionRecord(
  sessionId: string,
  initialMessages: BaseMessage[] = [],
  ttlMs: number = DEFAULT_TTL_MS,
): SessionRecord {
  const createdAt = nowMs()
  return {
    sessionId,
    messages: initialMessages,
    createdAt,
    updatedAt: createdAt,
    expiryTime: createdAt + ttlMs,
  }
}

/** 在原有记录基础上刷新内容与过期时间（每次交互都续期，行为与内存 Map 阶段一致） */
export function touchSessionRecord(
  record: SessionRecord,
  patch: Partial<Pick<SessionRecord, 'messages' | 'summary' | 'emotionSnapshot'>>,
  ttlMs: number = DEFAULT_TTL_MS,
): SessionRecord {
  const updatedAt = nowMs()
  return {
    ...record,
    ...patch,
    updatedAt,
    expiryTime: updatedAt + ttlMs,
  }
}
