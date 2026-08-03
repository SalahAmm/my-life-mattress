import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

const specs = {
  inter: [400, 500, 600, 700],
  'nunito-sans': [400, 600, 700, 800],
  'noto-sans-arabic': [400, 500, 600, 700],
}

const subsets = {
  inter: ['latin', 'latin-ext'],
  'nunito-sans': ['latin', 'latin-ext'],
  'noto-sans-arabic': ['arabic'],
}

const targets = [path.join(root, 'public', 'fonts'), path.join(root, 'electron', 'assets', 'fonts')]

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true })
}

for (const [pkg, weights] of Object.entries(specs)) {
  const filesDir = path.join(root, 'node_modules', '@fontsource', pkg, 'files')
  for (const weight of weights) {
    for (const subset of subsets[pkg]) {
      const name = `${pkg}-${subset}-${weight}-normal.woff2`
      const src = path.join(filesDir, name)
      if (!fs.existsSync(src)) {
        console.warn(`missing: ${name}`)
        continue
      }
      for (const target of targets) {
        fs.copyFileSync(src, path.join(target, name))
      }
    }
  }
}

console.log('fonts copied to public/fonts and electron/assets/fonts')
