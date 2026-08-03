import type { ReactNode } from 'react'

export function DataTableShell({
  toolbar,
  children,
  empty,
}: {
  toolbar?: ReactNode
  children: ReactNode
  empty?: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border bg-card">
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b p-3">{toolbar}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {empty}
    </div>
  )
}
