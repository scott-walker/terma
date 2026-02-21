import { useFileManagerStore } from '@/stores/file-manager-store'
import { FileTree } from './FileTree'

export function FileManager(): JSX.Element {
  const { visible, rootPath } = useFileManagerStore()

  if (!visible) return <></>

  const dirName = rootPath.split('/').pop() || rootPath

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-white/[0.04] bg-[#0f0f17]">
      <div className="flex h-8 items-center px-3 text-[11px] font-semibold uppercase tracking-widest text-[#565f89]">
        {dirName}
      </div>
      <div className="flex-1 overflow-hidden">
        <FileTree />
      </div>
    </div>
  )
}
