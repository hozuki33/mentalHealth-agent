import { getAuthToken } from '@/utils/auth'
import service from '@/utils/request'

export interface StartSessionPayload {
  initialMessage: string
  sessionTitle: string
}

type ApiParams = Record<string, unknown>
type ApiPayload = Record<string, unknown>
type ApiId = string | number

export interface RegisterPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
  gender: number
  userType: number
}

// 注册
export const register = (data: RegisterPayload) => {
  return service.post('/user/add', data, { skipAuth: true })
}

// 创建会话
export const startSession = (data: StartSessionPayload) => {
  const token = getAuthToken()
  return service.post('/psychological-chat/session/start', data, {
    headers: token ? { token } : {},
  })
}

// 分页查询咨询会话
export const getSessionList = (params: ApiParams) => {
  return service.get('/psychological-chat/sessions', { params })
}

// 删除咨询会话
export const deleteSession = (sessionId: ApiId) => {
  return service.delete(`/psychological-chat/sessions/${sessionId}`)
}

// 获取对话消息列表
export const getSessionDetail = (sessionId: ApiId) => {
  return service.get(`/psychological-chat/sessions/${sessionId}/messages`)
}


// 获取会话情绪分析结果
export const getSessionEmotion = (sessionId: ApiId) => {
  return service.get(`/psychological-chat/session/${sessionId}/emotion`)
}

// 情绪日志创建/更新
export const addEmotionDiary = (data: ApiPayload) => {
  return service.post('/emotion-diary', data)
}

// 查询知识文章列表
export const getKnowledgeList = (params: ApiParams) => {
  return service.get('/knowledge/article/page', { params })
}

// 获取知识文章详情
export const getKnowledgeDetail = (articleId: ApiId) => {
  return service.get(`/knowledge/article/${articleId}`)
}
