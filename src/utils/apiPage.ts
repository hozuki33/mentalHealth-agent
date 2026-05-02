/**
 * 从常见分页/列表接口响应中取出记录数组（兼容多种字段与一层嵌套）。
 */
export function getPageRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const page = data as Record<string, unknown>
  const keys = ['records', 'list', 'rows', 'content', 'items', 'data', 'pageData', 'articleList']
  for (const key of keys) {
    const v = page[key]
    if (Array.isArray(v)) return v
    if (v && typeof v === 'object') {
      const inner = v as Record<string, unknown>
      const nested = inner.records ?? inner.list ?? inner.rows ?? inner.content
      if (Array.isArray(nested)) return nested
    }
  }
  return []
}

/** 从常见分页响应中取总条数 */
export function getPageTotal(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const page = data as Record<string, unknown>
  for (const key of ['total', 'totalCount', 'totalElements', 'recordCount']) {
    const n = Number(page[key])
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 0
}
