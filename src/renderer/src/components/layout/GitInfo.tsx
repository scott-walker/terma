import { useState, useCallback, useEffect, memo } from 'react'
import { GitBranch, ChevronDown } from 'lucide-react'
import { GitBranchDropdown } from '@/components/layout/GitBranchDropdown'

interface GitInfoProps {
  cwd: string
  isSshMode: boolean
}

export const GitInfo = memo(function GitInfo({ cwd, isSshMode }: GitInfoProps): JSX.Element | null {
  const [gitInfo, setGitInfo] = useState<{ repo: string; branch: string; url: string | null } | null>(null)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshGitInfo = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (isSshMode) {
      setGitInfo(null)
      return
    }
    let stale = false
    window.api.git.getInfo(cwd).then((info) => {
      if (!stale) setGitInfo(info)
    }).catch(() => {
      if (!stale) setGitInfo(null)
    })
    return () => { stale = true }
  }, [cwd, isSshMode, refreshKey])

  if (!gitInfo) return null

  return (
    <div className="flex min-w-0 cursor-default items-center gap-1.5 text-xs text-fg-muted" draggable={false}>
      <GitBranch size={13} strokeWidth={1.8} className="shrink-0 text-fg-muted" />
      {gitInfo.url ? (
        <a
          href={gitInfo.url}
          draggable={false}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open(gitInfo.url!, '_blank')
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
          className="cursor-pointer truncate text-fg-muted underline decoration-fg-muted/30 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/50"
        >
          {gitInfo.repo}
        </a>
      ) : (
        <span className="truncate text-fg-muted">{gitInfo.repo}</span>
      )}
      <span className="opacity-40">/</span>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowBranchDropdown((v) => !v)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex cursor-pointer items-center gap-1 truncate rounded-sm px-1 py-0.5 font-medium text-fg transition-colors hover:bg-pane-active/[0.13] hover:text-accent"
        >
          <span className="truncate">{gitInfo.branch}</span>
          <ChevronDown size={11} strokeWidth={2} className="shrink-0 opacity-50" />
        </button>
        {showBranchDropdown && (
          <GitBranchDropdown
            cwd={cwd}
            onCheckout={refreshGitInfo}
            onClose={() => setShowBranchDropdown(false)}
          />
        )}
      </div>
    </div>
  )
})
