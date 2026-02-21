import { useFileManagerStore } from '@/stores/file-manager-store'
import { FileTree } from './FileTree'

export function FileManager(): JSX.Element {
  const { visible, rootPath } = useFileManagerStore()

  if (!visible) return <></>

  const dirName = rootPath.split('/').pop() || rootPath

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-[#1a1b26] bg-[#16161e]">
      <div className="flex h-8 items-center px-3 text-xs font-semibold uppercase tracking-wider text-[#565f89]">
        {dirName}
      </div>
      <div className="flex-1 overflow-hidden">
        <FileTree />
      </div>
    </div>
  )
}
