import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import type { AgentProfile } from '@shared/agent-types'

interface AgentDropdownProps {
  profiles: AgentProfile[]
  selectedId: string | undefined
  onSelect: (profileId: string) => void
  onManage: () => void
  onClose: () => void
}

export function AgentDropdown({
  profiles,
  selectedId,
  onSelect,
  onManage,
  onClose
}: AgentDropdownProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    // Defer listener registration to avoid catching the same click that opened us
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    })
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-border bg-popup-bg py-1 shadow-xl"
      >
        {profiles.length === 0 ? (
          <div className="px-3 py-2 text-sm text-fg-muted">No agents configured</div>
        ) : (
          profiles.map((profile) => {
            const isActive = profile.id === selectedId
            return (
              <button
                key={profile.id}
                onClick={() => { onSelect(profile.id); onClose() }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${isActive ? '' : 'hover:bg-surface-hover'}`}
              >
                <div className="flex flex-1 flex-col">
                  <span className={`text-sm ${isActive ? 'text-pane-active' : 'text-fg'}`}>{profile.name}</span>
                  <span className={`text-xs ${isActive ? 'text-pane-active/60' : 'text-fg-muted'}`}>{profile.command}</span>
                </div>
                {isActive && <Check size={14} strokeWidth={2} className="shrink-0 text-pane-active" />}
              </button>
            )
          })
        )}

        <div className="my-1 border-t border-border" />
        <button
          onClick={() => { onManage(); onClose() }}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          Manage agents...
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
