import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '@/stores/toast-store'

const typeColors: Record<string, string> = {
  success: 'bg-accent',
  error: 'bg-danger',
  info: 'bg-info'
}

export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed top-12 right-3 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.2 }}
            className="flex items-stretch overflow-hidden rounded-md border border-border bg-popup-bg shadow-xl"
          >
            <div className={`w-1 shrink-0 ${typeColors[toast.type]}`} />
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-fg">
              <span className="min-w-0 break-words">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-1 shrink-0 text-fg-muted transition-colors hover:text-fg"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
