import { spawn } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_DEV_SERVER_URL

const child = spawn(electronExe, ['.'], {
  env,
  stdio: 'inherit',
  cwd: root,
  windowsHide: false,
})

child.on('exit', (code) => process.exit(code ?? 0))
