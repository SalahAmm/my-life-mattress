import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'out')
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')

fs.mkdirSync(outDir, { recursive: true })
fs.cpSync(path.join(root, 'electron', 'assets'), path.join(outDir, 'assets'), {
  recursive: true,
  force: true,
})

const entryPoints = {
  main: path.join(root, 'electron', 'main.ts'),
  preload: path.join(root, 'electron', 'preload.ts'),
}

let electronProc = null
let restartTimer = null

function electronEnv() {
  const env = { ...process.env, ELECTRON_DEV_SERVER_URL: 'http://localhost:5173' }
  delete env.ELECTRON_RUN_AS_NODE
  return env
}

function startElectron() {
  if (electronProc) {
    electronProc.kill()
    electronProc = null
  }
  if (!fs.existsSync(electronExe)) {
    console.error('electron.exe not found at', electronExe)
    return
  }
  electronProc = spawn(electronExe, ['.'], {
    env: electronEnv(),
    stdio: 'inherit',
    cwd: root,
    windowsHide: false,
  })
  electronProc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`electron exited (code ${code})`)
    }
  })
}

async function buildAll() {
  await Promise.all([
    build({
      entryPoints: [entryPoints.main],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node22',
      outfile: path.join(outDir, 'main.js'),
      external: ['electron', 'better-sqlite3'],
      sourcemap: true,
    }),
    build({
      entryPoints: [entryPoints.preload],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node22',
      outfile: path.join(outDir, 'preload.js'),
      external: ['electron'],
      sourcemap: true,
    }),
  ])
}

function scheduleRestart() {
  clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    try {
      await buildAll()
      console.log('electron rebuilt')
      startElectron()
    } catch (error) {
      console.error('rebuild failed:', error)
    }
  }, 250)
}

function watchElectronSources() {
  try {
    fs.watch(path.join(root, 'electron'), { recursive: true }, (_event, filename) => {
      if (filename && filename.endsWith('.ts')) {
        scheduleRestart()
      }
    })
  } catch {
    console.log('recursive watch unavailable; main-process changes need a manual restart')
  }
}

const viteServer = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  root,
})

await viteServer.listen()
console.log('vite dev server: http://localhost:5173')

await buildAll()
console.log('electron built -> out/')

watchElectronSources()
startElectron()

const shutdown = () => {
  if (electronProc) electronProc.kill()
  viteServer.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
