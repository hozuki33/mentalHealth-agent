/** ISO 时间串转为 `YYYY-MM-DD HH:mm` 展示 */
export function formatDateTimeShort(value: unknown): string {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}
