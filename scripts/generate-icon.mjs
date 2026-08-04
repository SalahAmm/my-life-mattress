import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SIZE = 512
const GOLD = [212, 175, 55, 255]
const SLATE = [30, 41, 59, 255]
const CORNER_RADIUS = 96
const STROKE = 40

function inRoundedRect(x, y, size, radius) {
  const min = radius
  const max = size - radius
  const cx = Math.min(Math.max(x, min), max)
  const cy = Math.min(Math.max(y, min), max)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.hypot(px - projX, py - projY)
}

const M_SEGMENTS = [
  [140, 140, 140, 372],
  [140, 140, 256, 300],
  [256, 300, 372, 140],
  [372, 140, 372, 372],
]

function pixel(x, y) {
  if (!inRoundedRect(x + 0.5, y + 0.5, SIZE, CORNER_RADIUS)) return [0, 0, 0, 0]
  const d = Math.min(...M_SEGMENTS.map(([x1, y1, x2, y2]) => distToSegment(x + 0.5, y + 0.5, x1, y1, x2, y2)))
  return d <= STROKE / 2 ? GOLD : SLATE
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const rows = []
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 4)
  row[0] = 0
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixel(x, y)
    const offset = 1 + x * 4
    row[offset] = r
    row[offset + 1] = g
    row[offset + 2] = b
    row[offset + 3] = a
  }
  rows.push(row)
}

const outDir = path.resolve(process.cwd(), 'build')
fs.mkdirSync(outDir, { recursive: true })
const png = encodePng(Buffer.concat(rows))
fs.writeFileSync(path.join(outDir, 'icon.png'), png)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
const entry = Buffer.alloc(16)
entry[0] = 0
entry[1] = 0
entry.writeUInt16LE(1, 4)
entry.writeUInt16LE(32, 6)
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12)
fs.writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([header, entry, png]))
console.log('icons written to build/icon.png and build/icon.ico')
