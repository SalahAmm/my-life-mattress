import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'out')

fs.mkdirSync(outDir, { recursive: true })
fs.cpSync(path.join(root, 'electron', 'assets'), path.join(outDir, 'assets'), {
  recursive: true,
  force: true,
})

await build({
  entryPoints: [path.join(root, 'electron', 'main.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: path.join(outDir, 'main.js'),
  external: ['electron', 'better-sqlite3'],
  sourcemap: true,
})

await build({
  entryPoints: [path.join(root, 'electron', 'preload.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: path.join(outDir, 'preload.js'),
  external: ['electron'],
  sourcemap: true,
})

console.log('electron main + preload bundled -> out/')
