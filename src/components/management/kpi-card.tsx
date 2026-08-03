import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KpiStatus = 'success' | 'warning' | 'destructive' | 'info'

const statusClasses: Record<KpiStatus, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  status = 'info',
  onClick,
}: {
  label: string
  value: string
  icon: LucideIcon
  status?: KpiStatus
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 border bg-card p-4 text-start',
        onClick && 'cursor-pointer transition-colors hover:bg-muted/50',
      )}
    >
      <span data-slot="kpi-icon" className={cn('flex size-11 shrink-0 items-center justify-center', statusClasses[status])}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
        <span className="block text-xl font-bold" dir="ltr">
          {value}
        </span>
      </span>
    </Comp>
  )
}
