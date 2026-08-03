import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral'

const variantClasses: Record<StatusVariant, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-border bg-secondary text-secondary-foreground',
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusVariant
  label: string
  className?: string
}) {
  return <Badge className={cn(variantClasses[status], className)}>{label}</Badge>
}
