import { render } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const css = fs.readFileSync(path.join(import.meta.dirname, '..', 'globals.css'), 'utf8')

describe('theme contract (ADR-0001)', () => {
  it('uses the brand palette in light mode', () => {
    expect(css).toMatch(/--sidebar: oklch\(0\.2 0\.045 262\)/)
    expect(css).toMatch(/--gold: oklch\(0\.8 0\.14 90\)/)
    expect(css).toMatch(/--primary: oklch\(0\.42 0\.15 263\)/)
    expect(css).toMatch(/--radius: 0rem/)
  })

  it('keeps a navy-anchored dark palette', () => {
    expect(css).toMatch(/--sidebar: oklch\(0\.14 0\.03 262\)/)
    expect(css).toMatch(/--gold: oklch\(0\.75 0\.13 90\)/)
  })

  it('has no Sera preset leftovers', () => {
    expect(css).not.toMatch(/playfair/i)
    expect(css).not.toMatch(/--primary: oklch\(0\.214 0\.009 43\.1\)/)
    expect(css).not.toMatch(/--radius: 0\.625rem/)
  })

  it('maps operational fonts to Inter/Nunito Sans with an Arabic override', () => {
    expect(css).toMatch(/Nunito Sans/)
    expect(css).toMatch(/Noto Sans Arabic/)
    expect(css).toMatch(/\[lang="ar"\]/)
  })
})

describe('primitive DOM contract', () => {
  it('buttons are square and sentence-case', () => {
    const { container } = render(<Button>Enregistrer</Button>)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('rounded-none')
    expect(cls).not.toMatch(/uppercase/)
    expect(cls).not.toMatch(/tracking-widest/)
  })

  it('inputs are fully outlined, not underline-only', () => {
    const { container } = render(<Input />)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('border-input')
    expect(cls).not.toContain('border-b-input')
  })

  it('labels are sentence-case with normal tracking', () => {
    const { container } = render(<Label>Nom du client</Label>)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).not.toMatch(/uppercase/)
    expect(cls).not.toMatch(/tracking-wide/)
  })

  it('badges render as bordered pills, not bare text', () => {
    const { container } = render(<Badge>En Stock</Badge>)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('border')
    expect(cls).toMatch(/rounded/)
    expect(cls).toMatch(/px-/)
    expect(cls).not.toMatch(/uppercase/)
    expect(cls).not.toMatch(/tracking-widest/)
  })

  it('card titles are sentence-case without decorative tracking', () => {
    const { container } = render(
      <Card>
        <CardTitle>Stock</CardTitle>
      </Card>,
    )
    const title = container.querySelector('[data-slot="card-title"]') as HTMLElement
    expect(title.className).not.toMatch(/uppercase/)
    expect(title.className).not.toMatch(/tracking-wider/)
  })
})
