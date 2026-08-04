export function toCsv(rows: Record<string, string | number>[], columns: string[]): string {
  const escape = (value: string | number): string => {
    const text = String(value)
    if (/[",\r\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`
    }
    return text
  }
  const header = columns.join(',')
  const body = rows.map((row) => columns.map((col) => escape(row[col] ?? '')).join(','))
  return `\uFEFF${[header, ...body].join('\r\n')}`
}
