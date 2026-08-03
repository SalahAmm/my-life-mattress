export interface MoneyLine {
  quantity: number
  unitPrice: number
}

export function lineTotal(line: MoneyLine): number {
  return line.quantity * line.unitPrice
}

export function saleTotal(lines: MoneyLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

export function depositFromPercentage(total: number, percent: number): number {
  return Math.round((total * percent) / 100)
}

export function remainingBalance(total: number, paid: number): number {
  return Math.max(0, total - paid)
}

export function formatDzd(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/[\u202F\u2009\u00A0]/g, '\u00A0')} DZD`
}
