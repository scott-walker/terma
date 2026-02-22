import { useEffect, useCallback } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop"
      onMouseDown={onCancel}
    >
      <div
        className="flex w-80 flex-col gap-4 rounded-lg bg-elevated p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="text-sm text-fg-secondary">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="cursor-pointer rounded-md bg-danger px-3 py-1.5 text-sm text-white transition-colors hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
