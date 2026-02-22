import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SshProfile } from '@shared/ssh-types'

interface SshDropdownProps {
  profiles: SshProfile[]
  isConnected: boolean
  onConnect: (profileId: string) => void
  onDisconnect: () => void
  onManage: () => void
  onClose: () => void
}

export function SshDropdown({
  profiles,
  isConnected,
  onConnect,
  onDisconnect,
  onManage,
  onClose
}: SshDropdownProps): JSX.Element {
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
        {isConnected && (
          <>
            <button
              onClick={() => { onDisconnect(); onClose() }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger hover:bg-surface-hover"
            >
              Disconnect
            </button>
            <div className="my-1 border-t border-border" />
          </>
        )}

        {profiles.length === 0 ? (
          <div className="px-3 py-2 text-sm text-fg-muted">No profiles saved</div>
        ) : (
          profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => { onConnect(profile.id); onClose() }}
              className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-surface-hover"
            >
              <span className="text-sm text-fg">{profile.name}</span>
              <span className="text-xs text-fg-muted">
                {profile.username}@{profile.host}:{profile.port}
              </span>
            </button>
          ))
        )}

        <div className="my-1 border-t border-border" />
        <button
          onClick={() => { onManage(); onClose() }}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          Manage connections...
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
