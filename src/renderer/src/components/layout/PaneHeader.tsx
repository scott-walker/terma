import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Columns2, Rows2, X, ChevronDown, Server, Loader2, Check, Terminal, FolderOpen, FileCode, Code2, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { baseName } from '@shared/path-utils'
import type { PaneType } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS, PANE_ACTIVE_CLASSES } from '@/lib/pane-types'
import { useTabStore } from '@/stores/tab-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import { useFileManagerStore } from '@/stores/file-manager-store'
import { useSshStore } from '@/stores/ssh-store'
import { useAgentStore } from '@/stores/agent-store'
import { getPtyId, destroy } from '@/lib/terminal-manager'
import { IconButton } from '@/components/ui/IconButton'
import { SshDropdown } from '@/components/file-manager/SshDropdown'
import { SshProfilesModal } from '@/components/file-manager/SshProfilesModal'
import { AgentDropdown } from '@/components/agent/AgentDropdown'
import { AgentProfilesModal } from '@/components/agent/AgentProfilesModal'
import { WhisperButton } from './WhisperButton'
import { GitInfo } from './GitInfo'
import { ShareModal } from '@/components/share/ShareModal'

interface PaneHeaderProps {
  tabId: string
  paneId: string
  paneType: PaneType
  cwd?: string | null
  paneRef?: React.RefObject<HTMLDivElement | null>
}

const previewPaneTypes = new Set<PaneType>(['markdown', 'image'])

type DropdownItem = 'terminal' | 'file-manager' | 'agent' | 'system-monitor' | 'ssh'

const DROPDOWN_ITEMS: { key: DropdownItem; label: string }[] = [
  { key: 'terminal', label: 'Terminal' },
  { key: 'file-manager', label: 'Files' },
  { key: 'agent', label: 'Agent' },
  { key: 'system-monitor', label: 'System' },
  { key: 'ssh', label: 'SSH' }
]

type SshSubMode = 'terminal' | 'file-manager'

const SSH_SUB_MODES: { key: SshSubMode; label: string; icon: typeof Terminal }[] = [
  { key: 'terminal', label: 'Terminal', icon: Terminal },
  { key: 'file-manager', label: 'Files', icon: FolderOpen }
]

const MIME_TYPE = 'application/x-terma-pane'

/** Hook to close a dropdown on click-outside or Escape */
function useDropdownClose(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, ref, onClose])
}

/* ── PaneTypeSelector: mode dropdown + SSH/Agent/SubMode selectors ── */

const PaneTypeSelector = memo(function PaneTypeSelector({
  tabId,
  paneId,
  paneType,
  isSshMode,
  isConnected,
  isConnecting,
  sshProfileLabel
}: {
  tabId: string
  paneId: string
  paneType: PaneType
  isSshMode: boolean
  isConnected: boolean
  isConnecting: boolean
  sshProfileLabel: string
}): JSX.Element {
  const config = PANE_TYPE_CONFIGS[paneType] ?? PANE_TYPE_CONFIGS.terminal
  const sshProfiles = useSettingsStore((s) => s.settings.sshProfiles)
  const enterSshMode = useSshStore((s) => s.enterSshMode)
  const exitSshMode = useSshStore((s) => s.exitSshMode)
  const sshConnect = useSshStore((s) => s.connect)
  const setSshProfile = useFileManagerStore((s) => s.setSshProfile)
  const setRootPath = useFileManagerStore((s) => s.setRootPath)
  const updatePaneCwd = useTabStore((s) => s.updatePaneCwd)
  const addToast = useToastStore((s) => s.addToast)

  const agentProfiles = useSettingsStore((s) => s.settings.agentProfiles ?? [])
  const agentProfileId = useAgentStore((s) => s.panes[paneId])
  const selectAgent = useAgentStore((s) => s.selectAgent)
  const agentProfile = agentProfiles.find((p) => p.id === agentProfileId)
  const agentLabel = agentProfile ? agentProfile.name : 'Select...'

  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showSshDropdown, setShowSshDropdown] = useState(false)
  const [showSubModeDropdown, setShowSubModeDropdown] = useState(false)
  const [showSshModal, setShowSshModal] = useState(false)
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)

  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const subModeDropdownRef = useRef<HTMLDivElement>(null)

  const closeTypeDropdown = useCallback(() => setShowTypeDropdown(false), [])
  const closeSubModeDropdown = useCallback(() => setShowSubModeDropdown(false), [])

  useDropdownClose(typeDropdownRef, showTypeDropdown, closeTypeDropdown)
  useDropdownClose(subModeDropdownRef, showSubModeDropdown, closeSubModeDropdown)

  const activeItem: DropdownItem = isSshMode
    ? 'ssh'
    : paneType === 'terminal'
      ? 'terminal'
      : paneType === 'agent'
        ? 'agent'
        : paneType === 'system-monitor'
          ? 'system-monitor'
          : 'file-manager'

  const sshSubMode: SshSubMode = paneType === 'file-manager' ? 'file-manager' : 'terminal'
  const currentSubMode = SSH_SUB_MODES.find((m) => m.key === sshSubMode)
  const DisplayIcon = isSshMode ? Server : config.icon
  const displayLabel = isSshMode ? 'SSH' : config.label

  const waitForPty = useCallback((tmKey: string): Promise<string | null> => {
    return new Promise((resolve) => {
      let attempts = 0
      const check = (): void => {
        const ptyId = getPtyId(tmKey)
        if (ptyId) { resolve(ptyId); return }
        attempts++
        if (attempts > 40) { resolve(null); return }
        setTimeout(check, 50)
      }
      setTimeout(check, 100)
    })
  }, [])

  const buildSshCommand = useCallback((profileId: string): string | null => {
    const profile = sshProfiles.find((p) => p.id === profileId)
    if (!profile) return null
    const portFlag = profile.port !== 22 ? ` -p ${profile.port}` : ''
    const keyFlag = profile.keyPath ? ` -i ${profile.keyPath.replace(/^~/, '$HOME')}` : ''
    return `ssh -t${portFlag}${keyFlag} ${profile.username}@${profile.host}\n`
  }, [sshProfiles])

  const handleSshConnect = useCallback(
    async (profileId: string) => {
      try {
        // Destroy any existing SSH PTY to avoid SSH-inside-SSH
        destroy(paneId + ':ssh')

        await sshConnect(paneId, profileId)
        setSshProfile(paneId, profileId)

        const profile = sshProfiles.find((p) => p.id === profileId)
        let remotePath = profile?.defaultPath || '~'
        if (remotePath === '~') {
          try {
            remotePath = await window.api.ssh.getHomeDir(profileId)
          } catch {
            remotePath = '/'
          }
        }
        setRootPath(paneId, remotePath)
        updatePaneCwd(tabId, paneId, remotePath)
        useTabStore.getState().setPaneType(tabId, paneId, 'terminal')

        const sshCmd = buildSshCommand(profileId)
        if (sshCmd) {
          const ptyId = await waitForPty(paneId + ':ssh')
          if (ptyId) {
            window.api.pty.write(ptyId, sshCmd)
          }
        }

        addToast('success', `Connected to ${profile?.name ?? 'server'}`)
      } catch (err) {
        addToast('error', `SSH: ${err instanceof Error ? err.message : 'Connection failed'}`)
      }
    },
    [paneId, tabId, sshConnect, setSshProfile, setRootPath, updatePaneCwd, addToast, sshProfiles, buildSshCommand, waitForPty]
  )

  const handleSshDisconnect = useCallback(async () => {
    destroy(paneId + ':ssh')
    exitSshMode(paneId)
    setSshProfile(paneId, null)
    const homePath = window.api.shell.homePath
    setRootPath(paneId, homePath)
    updatePaneCwd(tabId, paneId, homePath)
    useTabStore.getState().setPaneType(tabId, paneId, 'terminal')
    addToast('info', 'SSH disconnected')
  }, [paneId, tabId, exitSshMode, setSshProfile, setRootPath, updatePaneCwd, addToast])

  const handleSelectItem = useCallback(
    (item: DropdownItem) => {
      setShowTypeDropdown(false)
      if (item === 'ssh') {
        enterSshMode(paneId)
        setShowSshDropdown(true)
        return
      }
      if (isSshMode) {
        destroy(paneId + ':ssh')
        exitSshMode(paneId)
        setSshProfile(paneId, null)
      }
      const targetPaneType: PaneType = item === 'terminal' ? 'terminal' : item === 'agent' ? 'agent' : item === 'system-monitor' ? 'system-monitor' : 'file-manager'
      if (paneType !== targetPaneType) {
        useTabStore.getState().setPaneType(tabId, paneId, targetPaneType)
      }
      if (item === 'agent') {
        setShowAgentDropdown(true)
      }
    },
    [tabId, paneId, paneType, isSshMode, enterSshMode, exitSshMode, setSshProfile]
  )

  const handleSelectSubMode = useCallback(
    (mode: SshSubMode) => {
      setShowSubModeDropdown(false)
      if (paneType !== mode) {
        useTabStore.getState().setPaneType(tabId, paneId, mode)
      }
    },
    [tabId, paneId, paneType]
  )

  const handleAgentSelect = useCallback(
    (profileId: string) => {
      if (profileId === useAgentStore.getState().panes[paneId]) return
      destroy(paneId + ':agent')
      selectAgent(paneId, profileId)
      if (paneType !== 'agent') {
        useTabStore.getState().setPaneType(tabId, paneId, 'agent')
      }
    },
    [paneId, tabId, paneType, selectAgent]
  )

  return (
    <>
      {/* 1st dropdown: mode selector */}
      <div ref={typeDropdownRef} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowTypeDropdown((v) => !v)
          }}
          className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-transparent bg-transparent px-2 py-0.5 text-sm transition-colors hover:bg-pane-active/[0.13]"
        >
          <DisplayIcon size={16} strokeWidth={1.8} className={PANE_ACTIVE_CLASSES.colorClass} />
          <span className="font-semibold text-fg">{displayLabel}</span>
          <ChevronDown size={13} strokeWidth={2} className="opacity-60" />
        </button>

        <AnimatePresence>
          {showTypeDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border bg-popup-bg py-1 shadow-xl"
            >
              {DROPDOWN_ITEMS.map((item, idx) => {
                const isActive = item.key === activeItem
                const isSshSeparator = item.key === 'ssh'
                const ItemIcon =
                  item.key === 'ssh'
                    ? Server
                    : PANE_TYPE_CONFIGS[item.key as PaneType]?.icon ?? Server
                return (
                  <div key={item.key}>
                    {isSshSeparator && idx > 0 && <div className="my-1 border-t border-border" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectItem(item.key)
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                        isActive ? 'text-pane-active' : 'text-fg hover:bg-surface-hover'
                      }`}
                    >
                      <ItemIcon size={16} strokeWidth={1.8} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <Check size={16} strokeWidth={2} className="text-pane-active" />}
                    </button>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SSH profile selector */}
      {isSshMode && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSshDropdown((v) => !v)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent px-2 py-0.5 text-sm transition-colors ${
              isConnecting
                ? 'text-pane-active'
                : isConnected
                  ? 'text-pane-active'
                  : 'text-fg-muted hover:text-fg'
            }`}
          >
            {isConnecting && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
            <span>{sshProfileLabel}</span>
            <ChevronDown size={13} strokeWidth={2} className="opacity-60" />
          </button>

          {showSshDropdown && (
            <SshDropdown
              profiles={sshProfiles}
              isConnected={isConnected}
              connectedProfileId={useSshStore.getState().panes[paneId]?.profileId}
              onConnect={handleSshConnect}
              onDisconnect={handleSshDisconnect}
              onManage={() => setShowSshModal(true)}
              onClose={() => setShowSshDropdown(false)}
            />
          )}
        </div>
      )}

      {/* Agent profile selector */}
      {paneType === 'agent' && !isSshMode && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAgentDropdown((v) => !v)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent px-2 py-0.5 text-sm transition-colors ${
              agentProfile ? 'text-pane-active' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span>{agentLabel}</span>
            <ChevronDown size={13} strokeWidth={2} className="opacity-60" />
          </button>

          {showAgentDropdown && (
            <AgentDropdown
              profiles={agentProfiles}
              selectedId={agentProfileId}
              onSelect={handleAgentSelect}
              onManage={() => setShowAgentModal(true)}
              onClose={() => setShowAgentDropdown(false)}
            />
          )}
        </div>
      )}

      {/* Sub-mode (Terminal / Files) — only when SSH connected */}
      {isSshMode && isConnected && currentSubMode && (
        <div ref={subModeDropdownRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSubModeDropdown((v) => !v)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent px-2 py-0.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <currentSubMode.icon size={14} strokeWidth={2} />
            <span>{currentSubMode.label}</span>
            <ChevronDown size={13} strokeWidth={2} className="opacity-60" />
          </button>

          <AnimatePresence>
            {showSubModeDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute left-0 top-full z-50 mt-1 min-w-[130px] rounded-md border border-border bg-popup-bg py-1 shadow-xl"
              >
                {SSH_SUB_MODES.map((mode) => {
                  const isActive = mode.key === sshSubMode
                  return (
                    <button
                      key={mode.key}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectSubMode(mode.key)
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                        isActive ? 'text-pane-active' : 'text-fg hover:bg-surface-hover'
                      }`}
                    >
                      <mode.icon size={16} strokeWidth={1.8} />
                      <span className="flex-1">{mode.label}</span>
                      {isActive && <Check size={16} strokeWidth={2} className="text-pane-active" />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showSshModal && <SshProfilesModal onClose={() => setShowSshModal(false)} />}
      {showAgentModal && <AgentProfilesModal onClose={() => setShowAgentModal(false)} />}
    </>
  )
})

/* ── PaneHeader ── */

export function PaneHeader({ tabId, paneId, paneType, cwd, paneRef }: PaneHeaderProps): JSX.Element {
  const config = PANE_TYPE_CONFIGS[paneType] ?? PANE_TYPE_CONFIGS.terminal
  const isPreview = previewPaneTypes.has(paneType)
  const hasApiKey = useSettingsStore((s) => !!s.settings.openaiApiKey)
  const idePath = useSettingsStore((s) => s.settings.idePath)

  const sshPaneState = useSshStore((s) => s.panes[paneId])
  const editorMeta = useSshStore((s) => s.editorPanes?.[paneId])
  const sshProfileId = useFileManagerStore((s) => s.panes[paneId]?.sshProfileId)
  const sshProfiles = useSettingsStore((s) => s.settings.sshProfiles)

  const isConnected = sshPaneState?.state === 'connected'
  const isConnecting = sshPaneState?.state === 'connecting'
  const isSshMode = !!sshPaneState
  const showMic = paneType === 'terminal' || paneType === 'agent'
  const showIde = !!idePath && (paneType === 'terminal' || paneType === 'file-manager')
  const showShare = paneType === 'terminal' || paneType === 'agent'

  const [showShareModal, setShowShareModal] = useState(false)

  // Resolve ptyId for this pane (terminal key is paneId, agent key is paneId+':agent')
  const tmKey = paneType === 'agent' ? paneId + ':agent' : isSshMode ? paneId + ':ssh' : paneId
  const ptyId = getPtyId(tmKey)

  const resolvedProfileId = sshProfileId || sshPaneState?.profileId
  const connectedProfile = sshProfiles.find((p) => p.id === resolvedProfileId)
  const sshProfileLabel = isConnecting
    ? 'Connecting...'
    : isConnected && connectedProfile
      ? connectedProfile.name
      : 'Connect...'

  return (
    <>
    <div
      className="flex shrink-0 cursor-grab items-center justify-between gap-3 border-b border-border bg-pane-header-bg px-3.5 py-2.5 active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME_TYPE, JSON.stringify({ paneId, tabId }))
        e.dataTransfer.effectAllowed = 'move'
        if (paneRef?.current) {
          const rect = paneRef.current.getBoundingClientRect()
          e.dataTransfer.setDragImage(paneRef.current, e.clientX - rect.left, e.clientY - rect.top)
        }
      }}
    >
      {/* Left: dropdown(s) or filename for preview/editor */}
      <div className="flex items-center gap-1.5">
        {editorMeta ? (
          <>
            <FileCode size={18} className={`${PANE_ACTIVE_CLASSES.colorClass} opacity-90`} />
            <span className="ml-1 truncate text-sm text-fg-muted">{editorMeta.profileName}</span>
            <span className="truncate text-sm font-semibold text-fg">{baseName(editorMeta.filePath)}</span>
          </>
        ) : isPreview ? (
          <>
            <config.icon size={18} className={`${PANE_ACTIVE_CLASSES.colorClass} opacity-90`} />
            <span className="ml-1 truncate text-sm font-semibold text-fg">
              {cwd ? baseName(cwd) : 'Markdown'}
            </span>
          </>
        ) : (
          <PaneTypeSelector
            tabId={tabId}
            paneId={paneId}
            paneType={paneType}
            isSshMode={isSshMode}
            isConnected={isConnected}
            isConnecting={isConnecting}
            sshProfileLabel={sshProfileLabel}
          />
        )}
      </div>

      {/* Center: git info */}
      {cwd && !isPreview && !isSshMode && (
        <GitInfo cwd={cwd} isSshMode={isSshMode} />
      )}

      {/* Right: mic + share + split + close */}
      <div className="flex gap-1.5">
        {showMic && !editorMeta && (
          <WhisperButton
            paneId={paneId}
            paneType={paneType}
            isSshMode={isSshMode}
            disabled={!hasApiKey}
          />
        )}
        {showShare && !editorMeta && ptyId && (
          <IconButton
            icon={Share2}
            onClick={(e) => {
              e.stopPropagation()
              setShowShareModal(true)
            }}
            title="Share terminal"
          />
        )}
        {showIde && !editorMeta && cwd && (
          <IconButton
            icon={Code2}
            onClick={(e) => {
              e.stopPropagation()
              window.api.shell.openWith(idePath, cwd)
            }}
            title="Open in IDE"
          />
        )}
        {!isPreview && !editorMeta && (
          <>
            <IconButton
              icon={Columns2}
              onClick={(e) => {
                e.stopPropagation()
                useTabStore.getState().splitPane(tabId, paneId, 'vertical')
              }}
              title="Split vertical"
            />
            <IconButton
              icon={Rows2}
              onClick={(e) => {
                e.stopPropagation()
                useTabStore.getState().splitPane(tabId, paneId, 'horizontal')
              }}
              title="Split horizontal"
            />
          </>
        )}
        <IconButton
          icon={X}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().closePane(tabId, paneId)
          }}
          title="Close pane"
        />
      </div>
    </div>
    {showShareModal && ptyId && (
      <ShareModal
        paneId={paneId}
        ptyId={ptyId}
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  )
}
