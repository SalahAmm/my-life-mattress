import fs from 'node:fs'
import path from 'node:path'

let logFile: string | null = null

export function initLogging(filePath: string): void {
  logFile = filePath
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

export function logError(context: string, error: unknown): void {
  const line = `[${new Date().toISOString()}] ${context}: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line)
    } catch {
      // logging must never crash the app
    }
  }
  console.error(line.trim())
}
