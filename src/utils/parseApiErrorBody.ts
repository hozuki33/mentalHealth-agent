/** 从非 2xx 响应体文本中尽量解析可读错误信息 */
export function parseApiErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string; msg?: string }
    return j.error?.message || j.message || j.msg || text
  } catch {
    return text
  }
}
