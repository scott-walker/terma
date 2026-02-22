import { useEffect, useState } from 'react'
import { baseName } from '@shared/path-utils'

interface ImagePaneProps {
  tabId: string
  paneId: string
  filePath: string
}

export function ImagePane({ filePath }: ImagePaneProps): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDataUrl(null)
    setError(null)
    window.api.fs.readFileAsDataUrl(filePath)
      .then(setDataUrl)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to read file'))
  }, [filePath])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-base p-4">
      <img
        src={dataUrl}
        alt={baseName(filePath)}
        className="max-h-full max-w-full object-contain"
        draggable={false}
      />
    </div>
  )
}
