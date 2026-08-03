import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return <img src="brand/logo.png" alt="My Life Mattress" className={cn('object-contain', className)} />
}
