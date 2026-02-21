import { readdir, stat, rename, rm } from 'fs/promises'
import { join } from 'path'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  size: number
  modified: number
}

export class FsService {
  async readDir(dirPath: string): Promise<FileEntry[]> {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const results: FileEntry[] = []

    for (const entry of entries) {
      try {
        const fullPath = join(dirPath, entry.name)
        const stats = await stat(fullPath)
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          size: stats.size,
          modified: stats.mtimeMs
        })
      } catch {
        // Skip entries we can't stat (permission issues etc.)
      }
    }

    // Sort: directories first, then alphabetical
    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return results
  }

  async stat(filePath: string): Promise<FileEntry> {
    const stats = await stat(filePath)
    const name = filePath.split('/').pop() || filePath
    return {
      name,
      path: filePath,
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      modified: stats.mtimeMs
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await rename(oldPath, newPath)
  }

  async delete(filePath: string): Promise<void> {
    await rm(filePath, { recursive: true })
  }
}
