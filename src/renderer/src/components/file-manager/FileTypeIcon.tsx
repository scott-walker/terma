import { getIcon } from 'material-file-icons'
import { Folder, FolderOpen } from 'lucide-react'

const svgCache = new Map<string, string>()

const folderColors: Record<string, string> = {
  src: '#42a5f5',
  lib: '#42a5f5',
  app: '#42a5f5',
  components: '#42a5f5',
  pages: '#42a5f5',
  hooks: '#42a5f5',
  utils: '#42a5f5',
  node_modules: '#8bc34a',
  '.git': '#f44336',
  '.github': '#f44336',
  '.vscode': '#42a5f5',
  dist: '#ffb74d',
  build: '#ffb74d',
  out: '#ffb74d',
  public: '#66bb6a',
  assets: '#66bb6a',
  static: '#66bb6a',
  test: '#ab47bc',
  tests: '#ab47bc',
  __tests__: '#ab47bc',
  config: '#78909c',
  scripts: '#78909c'
}

const defaultFolderColor = '#90a4ae'

interface FileTypeIconProps {
  name: string
  isDirectory: boolean
  isExpanded?: boolean
  size?: number
}

export function FileTypeIcon({
  name,
  isDirectory,
  isExpanded = false,
  size = 16
}: FileTypeIconProps): JSX.Element {
  if (isDirectory) {
    const color = folderColors[name] || defaultFolderColor
    const Icon = isExpanded ? FolderOpen : Folder
    return <Icon size={size} color={color} strokeWidth={1.5} />
  }

  let svg = svgCache.get(name)
  if (!svg) {
    svg = getIcon(name).svg
    svgCache.set(name, svg)
  }

  return (
    <span
      className="file-type-icon"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
