import { readdir, stat, lstat, realpath, rename, rm, copyFile, mkdir, access } from 'fs/promises'
import { join, basename, dirname, extname } from 'path'
import type { FileEntry } from '../../shared/types'
import { logger } from '../services/logger-service'

const MAX_DEPTH = 64

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
      } catch (err) {
        logger.debug('fs', `readDir: failed to stat ${entry.name}`, err)
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
    const name = basename(filePath)
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
      const visited = new Set<string>()
      const total = await this.countFiles(srcPath, visited, 0)
      let done = 0
      visited.clear()
      await this.copyDirRecursive(srcPath, destPath, visited, 0, () => {
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

  private async countFiles(dirPath: string, visited: Set<string>, depth: number): Promise<number> {
    if (depth > MAX_DEPTH) {
      logger.warn('fs', `countFiles: max depth ${MAX_DEPTH} reached at ${dirPath}`)
      return 0
    }

    const real = await this.safeRealpath(dirPath)
    if (real && visited.has(real)) {
      logger.warn('fs', `countFiles: cyclic symlink detected at ${dirPath}`)
      return 0
    }
    if (real) visited.add(real)

    let count = 0
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        count += await this.countFiles(full, visited, depth + 1)
      } else {
        count++
      }
    }
    return count
  }

  private async copyDirRecursive(
    src: string,
    dest: string,
    visited: Set<string>,
    depth: number,
    onFile: () => void
  ): Promise<void> {
    if (depth > MAX_DEPTH) {
      logger.warn('fs', `copyDirRecursive: max depth ${MAX_DEPTH} reached at ${src}`)
      return
    }

    const real = await this.safeRealpath(src)
    if (real && visited.has(real)) {
      logger.warn('fs', `copyDirRecursive: cyclic symlink detected at ${src}`)
      return
    }
    if (real) visited.add(real)

    await mkdir(dest, { recursive: true })
    const entries = await readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcFull = join(src, entry.name)
      const destFull = join(dest, entry.name)
      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcFull, destFull, visited, depth + 1, onFile)
      } else {
        await copyFile(srcFull, destFull)
        onFile()
      }
    }
  }

  async searchFiles(
    rootDir: string,
    query: string,
    limit = 100
  ): Promise<FileEntry[]> {
    const lowerQuery = query.toLowerCase()
    const results: FileEntry[] = []
    const visited = new Set<string>()

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH || results.length >= limit) return

      const real = await this.safeRealpath(dir)
      if (real && visited.has(real)) return
      if (real) visited.add(real)

      let dirents: import('fs').Dirent[]
      try {
        dirents = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of dirents) {
        if (results.length >= limit) return

        const name = entry.name
        // Skip common heavy/hidden directories
        if (entry.isDirectory() && (name === 'node_modules' || name === '.git' || name === '.hg' || name === '.svn' || name === '__pycache__' || name === '.DS_Store')) {
          continue
        }

        const fullPath = join(dir, name)

        if (entry.isDirectory()) {
          // Also check if directory name matches
          if (name.toLowerCase().includes(lowerQuery)) {
            try {
              const stats = await stat(fullPath)
              results.push({
                name,
                path: fullPath,
                isDirectory: true,
                isSymlink: entry.isSymbolicLink(),
                size: stats.size,
                modified: stats.mtimeMs
              })
            } catch { /* skip */ }
          }
          await walk(fullPath, depth + 1)
        } else {
          if (name.toLowerCase().includes(lowerQuery)) {
            try {
              const stats = await stat(fullPath)
              results.push({
                name,
                path: fullPath,
                isDirectory: false,
                isSymlink: entry.isSymbolicLink(),
                size: stats.size,
                modified: stats.mtimeMs
              })
            } catch { /* skip */ }
          }
        }
      }
    }

    await walk(rootDir, 0)
    return results
  }

  private async safeRealpath(p: string): Promise<string | null> {
    try {
      return await realpath(p)
    } catch {
      return null
    }
  }
}
