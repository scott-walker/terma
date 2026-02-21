import { readdir, stat, rename, rm, copyFile, mkdir, access } from 'fs/promises'
import { join, basename, dirname, extname } from 'path'

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

  async copy(
    srcPath: string,
    destDir: string,
    progressCb?: (done: number, total: number) => void
  ): Promise<void> {
    const srcStat = await stat(srcPath)
    const destPath = await this.resolveConflict(join(destDir, basename(srcPath)))

    if (srcStat.isDirectory()) {
      const total = await this.countFiles(srcPath)
      let done = 0
      await this.copyDirRecursive(srcPath, destPath, () => {
        done++
        progressCb?.(done, total)
      })
    } else {
      progressCb?.(0, 1)
      await copyFile(srcPath, destPath)
      progressCb?.(1, 1)
    }
  }

  private async resolveConflict(destPath: string): Promise<string> {
    let candidate = destPath
    let counter = 0
    while (await this.exists(candidate)) {
      counter++
      const dir = dirname(destPath)
      const ext = extname(destPath)
      const base = basename(destPath, ext)
      const suffix = counter === 1 ? ' (copy)' : ` (copy ${counter})`
      candidate = join(dir, `${base}${suffix}${ext}`)
    }
    return candidate
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await access(p)
      return true
    } catch {
      return false
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    let count = 0
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        count += await this.countFiles(full)
      } else {
        count++
      }
    }
    return count
  }

  private async copyDirRecursive(
    src: string,
    dest: string,
    onFile: () => void
  ): Promise<void> {
    await mkdir(dest, { recursive: true })
    const entries = await readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcFull = join(src, entry.name)
      const destFull = join(dest, entry.name)
      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcFull, destFull, onFile)
      } else {
        await copyFile(srcFull, destFull)
        onFile()
      }
    }
  }
}
