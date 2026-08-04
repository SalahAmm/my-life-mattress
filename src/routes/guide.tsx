import { useTranslation } from 'react-i18next'
import { BarChart3, Lightbulb, Package, Rocket, Settings, ShoppingCart, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Session } from '@shared/types'
import { PageHeader } from '@/components/management/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GuideSection {
  key: string
  icon: LucideIcon
  points: string[]
}

function buildSections(t: (key: string) => string): GuideSection[] {
  const sections: GuideSection[] = []
  for (const key of ['quickstart', 'counter', 'stock', 'delivery', 'reports', 'settings', 'tips'] as const) {
    const points: string[] = []
    for (let i = 0; ; i++) {
      const point = t(`guide.${key}.points.${i}`)
      if (point === `guide.${key}.points.${i}`) break
      points.push(point)
    }
    sections.push({ key, icon: sectionIcons[key], points })
  }
  return sections
}

const sectionIcons: Record<string, LucideIcon> = {
  quickstart: Rocket,
  counter: ShoppingCart,
  stock: Package,
  delivery: Truck,
  reports: BarChart3,
  settings: Settings,
  tips: Lightbulb,
}

export function GuidePage({ session }: { session: Session }) {
  const { t } = useTranslation()
  const sections = buildSections(t)

  void session

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('guide.title')} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="size-5 text-gold" />
                {t(`guide.${section.key}.title`)}
              </CardTitle>
              <CardDescription>{t(`guide.${section.key}.description`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 ps-5 text-sm">
                {section.points.map((point, index) => (
                  <li key={index} dir="auto">
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
