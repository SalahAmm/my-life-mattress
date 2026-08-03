import path from 'node:path'
import { app, BrowserWindow, dialog, net, protocol } from 'electron'
import { createDatabase } from './db/connection'
import { AuthService } from './auth/service'
import { registerIpcHandlers } from './ipc/handlers'
import { initLogging, logError } from './log'

app.setPath('userData', path.join(app.getPath('appData'), 'my-life-mattress'))

protocol.registerSchemesAsPrivileged([
  { scheme: 'app-asset', privileges: { standard: false, secure: true, supportFetchAPI: true } },
])

const isDev = Boolean(process.env.ELECTRON_DEV_SERVER_URL)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f6f7f9',
    title: 'My Life Mattress',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_DEV_SERVER_URL!)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  try {
    initLogging(path.join(app.getPath('userData'), 'logs', 'app.log'))
    const db = createDatabase(path.join(app.getPath('userData'), 'store.db'))
    const auth = new AuthService(db)
    registerIpcHandlers(db, auth)
    createWindow()

    const logosDir = path.join(app.getPath('userData'), 'logos')
    protocol.handle('app-asset', (request) => {
      const url = new URL(request.url)
      const requested = decodeURIComponent(url.pathname).replace(/^[/\\]+/, '')
      const resolved = path.normalize(path.join(logosDir, requested))
      const logosDirNorm = path.normalize(logosDir)
      if (!(resolved === logosDirNorm || resolved.startsWith(logosDirNorm + path.sep))) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileUrl(resolved))
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error)
    try {
      initLogging(path.join(app.getPath('userData'), 'logs', 'app.log'))
      logError('startup', error)
    } catch {
      // logging unavailable; fall through to dialog
    }
    dialog.showErrorBox('Erreur de démarrage', message)
    app.quit()
  }
})

function pathToFileUrl(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, '/')
  return `file://${normalized.startsWith('/') ? '' : '/'}${encodeURI(normalized)}`
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
