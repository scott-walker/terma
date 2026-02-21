import { useWorkspaceStore } from '@/stores/workspace-store'

export function WorkspaceBar(): JSX.Element {
  const { workspaces, workspaceOrder, activeWorkspaceId, setActiveWorkspace, createWorkspace } =
    useWorkspaceStore()

  if (workspaceOrder.length <= 1) return <></>

  return (
    <div className="flex h-8 items-center gap-1 border-b border-[#1a1b26] bg-[#16161e] px-2">
      {workspaceOrder.map((id) => {
        const ws = workspaces[id]
        if (!ws) return null
        return (
          <button
            key={id}
            className={`rounded px-3 py-0.5 text-xs transition-colors ${
              id === activeWorkspaceId
                ? 'bg-[#1a1b26] text-[#c0caf5]'
                : 'text-[#565f89] hover:text-[#a9b1d6]'
            }`}
            onClick={() => setActiveWorkspace(id)}
          >
            {ws.name}
          </button>
        )
      })}
      <button
        className="ml-1 flex h-5 w-5 items-center justify-center rounded text-[#565f89] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
        onClick={() => createWorkspace(`Workspace ${workspaceOrder.length + 1}`)}
        title="New workspace"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
