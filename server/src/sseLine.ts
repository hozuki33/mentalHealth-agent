export function sseLine(payload: Record<string, unknown> | string): string {
  if (typeof payload === 'string') {
    return `data: ${payload}\n\n`
  }
  return `data: ${JSON.stringify(payload)}\n\n`
}
