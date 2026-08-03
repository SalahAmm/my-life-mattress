import { useTranslation } from 'react-i18next'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  html: string
  onPrint: () => Promise<unknown>
  printing: boolean
  printError: string | null
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  html,
  onPrint,
  printing,
  printError,
}: PrintPreviewDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[520px] rounded-md border bg-white">
          <iframe title={title} sandbox="" srcDoc={html} className="h-[520px] w-full" />
        </ScrollArea>
        {printError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {printError}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X />
            {t('counter.close')}
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => void onPrint()} disabled={printing}>
            <Printer />
            {t('counter.print')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
