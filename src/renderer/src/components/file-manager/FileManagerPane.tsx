import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { RefreshCw, Loader2, Search } from 'lucide-react'
import { FileTree } from './FileTree'
import { FileSearchModal } from './FileSearchModal'
import { IconButton } from '@/components/ui/IconButton'
import { useFileManagerStore } from '@/stores/file-manager-store'
import { useSshStore } from '@/stores/ssh-store'
import { useTabStore } from '@/stores/tab-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import * as terminalManager from '@/lib/terminal-manager'
import { isAbsolute, normalizePath, parentDir } from '@shared/path-utils'
import type { FileEntry } from '@shared/types'

interface FileManagerPaneProps {
  tabId: string
  paneId: string
  cwd?: string | null
}

export function FileManagerPane({ tabId, paneId, cwd }: FileManagerPaneProps): JSX.Element {
  const pane = useFileManagerStore((s) => s.panes[paneId])
  const initPane = useFileManagerStore((s) => s.initPane)
  const setRootPath = useFileManagerStore((s) => s.setRootPath)
  const toggleDir = useFileManagerStore((s) => s.toggleDir)
  const updatePaneCwd = useTabStore((s) => s.updatePaneCwd)
  const addToast = useToastStore((s) => s.addToast)
  const sshProfiles = useSettingsStore((s) => s.settings.sshProfiles)
  const fontSize = useSettingsStore((s) => s.settings.fontSize)
  const sshPaneState = useSshStore((s) => s.panes[paneId])

  const [pathInput, setPathInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [isLoadingDir, setIsLoadingDir] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isConnected = sshPaneState?.state === 'connected'
  const isConnecting = sshPaneState?.state === 'connecting'
  const sshProfileId = pane?.sshProfileId

  useEffect(() => {
    initPane(paneId, cwd ?? undefined)
    // No cleanup here — state persists across pane type switches.
    // Actual cleanup happens in tab-store closePane/closeTab.
  }, [paneId, initPane])

  useEffect(() => {
    if (pane && !isEditing) {
      setPathInput(pane.rootPath)
    }
  }, [pane?.rootPath, isEditing])

  useEffect(() => {
    const handler = (): void => setShowSearch(true)
    window.addEventListener('terma:file-search', handler)
    return () => window.removeEventListener('terma:file-search', handler)
  }, [])

  const pendingReads = useRef(0)

  const readDirFn = useMemo(() => {
    if (!isConnected || !sshProfileId) return undefined
    return async (path: string): Promise<FileEntry[]> => {
      pendingReads.current++
      setIsLoadingDir(true)
      try {
        return await window.api.ssh.readDir(sshProfileId, path)
      } finally {
        pendingReads.current--
        if (pendingReads.current === 0) setIsLoadingDir(false)
      }
    }
  }, [isConnected, sshProfileId])

  const navigateTo = useCallback(
    async (path: string) => {
      const trimmed = path.trim()
      if (!trimmed) return
      const resolved = isAbsolute(trimmed)
        ? trimmed
        : (pane?.rootPath ?? '/') + '/' + trimmed
      const normalized = normalizePath(resolved)
      try {
        const readDir = readDirFn ?? window.api.fs.readDir
        const items = await readDir(normalized)
        if (items !== undefined) {
          setRootPath(paneId, normalized)
          updatePaneCwd(tabId, paneId, normalized)
          setIsEditing(false)
          inputRef.current?.blur()
        }
      } catch {
        addToast('error', `Directory not found: ${normalized}`)
      }
    },
    [paneId, tabId, pane?.rootPath, setRootPath, updatePaneCwd, addToast, readDirFn]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navigateTo(pathInput)
      } else if (e.key === 'Escape') {
        setPathInput(pane?.rootPath ?? '')
        setIsEditing(false)
        inputRef.current?.blur()
      }
    },
    [pathInput, navigateTo, pane?.rootPath]
  )

  const handleNavigateToDir = useCallback(
    (path: string) => {
      setRootPath(paneId, path)
      updatePaneCwd(tabId, paneId, path)
    },
    [paneId, tabId, setRootPath, updatePaneCwd]
  )

  const handleNavigateUp = useCallback(() => {
    if (!pane || pane.rootPath === '/') return
    const parent = parentDir(pane.rootPath)
    setRootPath(paneId, parent)
    updatePaneCwd(tabId, paneId, parent)
  }, [pane?.rootPath, paneId, tabId, setRootPath, updatePaneCwd])

  const handleOpenSshTerminal = useCallback(
    async (remotePath: string) => {
      if (!sshProfileId) return
      const profile = sshProfiles.find((p) => p.id === sshProfileId)
      if (!profile) return

      const newPaneId = await useTabStore.getState().splitPane(tabId, paneId, 'vertical')
      if (!newPaneId) return

      // Wait for PTY to be created, then write SSH command
      const waitForPty = (): Promise<string | null> => {
        return new Promise((resolve) => {
          let attempts = 0
          const check = (): void => {
            const ptyId = terminalManager.getPtyId(newPaneId)
            if (ptyId) { resolve(ptyId); return }
            attempts++
            if (attempts > 40) { resolve(null); return }
            setTimeout(check, 50)
          }
          setTimeout(check, 100)
        })
      }
      const ptyId = await waitForPty()
      if (ptyId) {
        const portFlag = profile.port !== 22 ? ` -p ${profile.port}` : ''
        const keyFlag = profile.keyPath ? ` -i ${profile.keyPath.replace(/^~/, '$HOME')}` : ''
        const sshCmd = `ssh -t${portFlag}${keyFlag} ${profile.username}@${profile.host} 'cd ${remotePath} && exec $SHELL'\n`
        window.api.pty.write(ptyId, sshCmd)
      }
    },
    [tabId, paneId, sshProfileId, sshProfiles]
  )

  const handleEditRemoteFile = useCallback(
    async (filePath: string) => {
      if (!sshProfileId) return
      const profile = sshProfiles.find((p) => p.id === sshProfileId)
      if (!profile) return

      const newPaneId = await useTabStore.getState().splitPane(tabId, paneId, 'vertical')
      if (!newPaneId) return

      // Register as SSH editor pane (for simplified header)
      useSshStore.getState().registerEditor(newPaneId, {
        profileName: profile.name,
        filePath
      })

      const waitForPty = (): Promise<string | null> => {
        return new Promise((resolve) => {
          let attempts = 0
          const check = (): void => {
            const ptyId = terminalManager.getPtyId(newPaneId)
            if (ptyId) { resolve(ptyId); return }
            attempts++
            if (attempts > 40) { resolve(null); return }
            setTimeout(check, 50)
          }
          setTimeout(check, 100)
        })
      }
      const ptyId = await waitForPty()
      if (ptyId) {
        const portFlag = profile.port !== 22 ? ` -p ${profile.port}` : ''
        const keyFlag = profile.keyPath ? ` -i ${profile.keyPath.replace(/^~/, '$HOME')}` : ''
        // exec replaces the shell with ssh — when vim exits, ssh exits, PTY exits
        const sshCmd = `exec ssh -t${portFlag}${keyFlag} ${profile.username}@${profile.host} 'vim "${filePath}"'\n`
        window.api.pty.write(ptyId, sshCmd)

        // Auto-close pane when vim/ssh exits
        const unsubExit = window.api.pty.onExit(ptyId, () => {
          unsubExit()
          useSshStore.getState().removeEditor(newPaneId)
          useTabStore.getState().closePane(tabId, newPaneId)
        })
      }
    },
    [tabId, paneId, sshProfileId, sshProfiles]
  )

  const handleOpenInSplit = useCallback(
    async (path: string) => {
      const newPaneId = await useTabStore.getState().splitPaneWithType(tabId, paneId, 'vertical', 'file-manager', path)
      if (newPaneId && isConnected && sshProfileId) {
        // Copy SSH state to the new pane
        useFileManagerStore.getState().setSshProfile(newPaneId, sshProfileId)
        useSshStore.getState().connect(newPaneId, sshProfileId).catch(() => {})
      }
    },
    [tabId, paneId, isConnected, sshProfileId]
  )

  if (!pane) return <div className="h-full w-full" />

  return (
    <div className="flex h-full w-full flex-col">
      {/* Path bar */}
      <div className="flex shrink-0 items-center border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => {
            setIsEditing(false)
            setPathInput(pane.rootPath)
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{ fontSize }}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-fg outline-none placeholder:text-fg-muted"
          placeholder="/"
        />
        <div className="flex items-center gap-1 pr-2">
          {isLoadingDir && (
            <Loader2 size={Math.round(fontSize * 1.15)} strokeWidth={1.8} className="animate-spin text-pane-active" />
          )}
          <IconButton
            icon={Search}
            onClick={() => setShowSearch(true)}
            title="Search files (Ctrl+P)"
          />
          <IconButton
            icon={RefreshCw}
            onClick={() => setRefreshToken((n) => n + 1)}
            title="Refresh"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="relative flex-1">
        {isConnecting ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-fg-muted" />
              <span className="text-sm text-fg-muted">Connecting...</span>
            </div>
          </div>
        ) : sshPaneState?.state === 'error' ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-danger">Connection failed</span>
              <span className="text-xs text-fg-muted">{sshPaneState.error}</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <FileTree
              rootPath={pane.rootPath}
              expandedDirs={pane.expandedDirs}
              onToggleDir={(path) => toggleDir(paneId, path)}
              onNavigateUp={handleNavigateUp}
              onNavigateToDir={handleNavigateToDir}
              onOpenInSplit={handleOpenInSplit}
              onPreviewFile={
                isConnected
                  ? undefined
                  : (path) => {
                      const paneType = /\.(md|markdown)$/i.test(path) ? 'markdown' : 'image'
                      useTabStore.getState().openRightPane(tabId, paneType, path)
                    }
              }
              onOpenSshTerminal={isConnected ? handleOpenSshTerminal : undefined}
              onEditRemoteFile={isConnected ? handleEditRemoteFile : undefined}
              refreshToken={refreshToken}
              readDirFn={readDirFn}
              isRemote={isConnected}
            />
          </div>
        )}
      </div>

      {showSearch && (
        <FileSearchModal
          rootPath={pane.rootPath}
          onClose={() => setShowSearch(false)}
          onSelect={(path, isDirectory) => {
            if (isDirectory) {
              handleNavigateToDir(path)
            } else {
              // Navigate to the file's parent directory
              const dir = path.substring(0, path.lastIndexOf('/')) || '/'
              handleNavigateToDir(dir)
            }
          }}
        />
      )}
    </div>
  )
}
