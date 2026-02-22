import { readlinkSync } from 'fs'
import { readdir, readFile, rename, rm, mkdir } from 'fs/promises'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { clipboard } from 'electron'
import { logger } from './logger-service'

export interface PlatformService {
  getCwd(pid: number): string | null
  getClipboardFilePaths(): string[]
  restoreFromTrash(originalPaths: string[]): Promise<{ ok: number; fail: number }>
}

class LinuxPlatformService implements PlatformService {
  getCwd(pid: number): string | null {
    try {
      return readlinkSync(`/proc/${pid}/cwd`).toString()
    } catch (err) {
      logger.debug('platform', `getCwd failed for pid ${pid}`, err)
      return null
    }
  }

  getClipboardFilePaths(): string[] {
    const formats = ['x-special/gnome-copied-files', 'x-special/kde-copied-files', 'text/uri-list']
    for (const fmt of formats) {
      const raw = clipboard.readBuffer(fmt).toString('utf-8')
      if (!raw.trim()) continue
      return raw
        .split(/\r?\n/)
        .filter((line) => line.startsWith('file://'))
        .map((uri) => decodeURIComponent(new URL(uri.trim()).pathname))
    }
    return []
  }

  async restoreFromTrash(originalPaths: string[]): Promise<{ ok: number; fail: number }> {
    const trashBase = join(homedir(), '.local/share/Trash')
    const infoDir = join(trashBase, 'info')
    const filesDir = join(trashBase, 'files')

    let infoFiles: string[]
    try {
      infoFiles = (await readdir(infoDir)).filter((f) => f.endsWith('.trashinfo'))
    } catch {
      return { ok: 0, fail: originalPaths.length }
    }

    // Build a map: originalPath -> best (most recent) trashinfo entry
    const trashMap = new Map<string, { trashName: string; date: number }>()
    for (const infoFile of infoFiles) {
      try {
        const content = await readFile(join(infoDir, infoFile), 'utf-8')
        const pathMatch = content.match(/Path=(.+)/)
        if (!pathMatch) continue
        const trashedPath = decodeURIComponent(pathMatch[1].trim())
        if (!originalPaths.includes(trashedPath)) continue

        const dateMatch = content.match(/DeletionDate=(.+)/)
        const date = dateMatch ? new Date(dateMatch[1].trim()).getTime() : 0
        const trashName = infoFile.replace(/\.trashinfo$/, '')

        const existing = trashMap.get(trashedPath)
        if (!existing || date > existing.date) {
          trashMap.set(trashedPath, { trashName, date })
        }
      } catch {
        // skip unreadable trashinfo
      }
    }

    let ok = 0
    let fail = 0

    for (const originalPath of originalPaths) {
      const entry = trashMap.get(originalPath)
      if (!entry) {
        fail++
        continue
      }
      try {
        const trashedFilePath = join(filesDir, entry.trashName)
        await mkdir(dirname(originalPath), { recursive: true })
        await rename(trashedFilePath, originalPath)
        await rm(join(infoDir, `${entry.trashName}.trashinfo`))
        ok++
      } catch {
        fail++
      }
    }

    logger.info('platform', `Trash restore: ${ok} ok, ${fail} fail`)
    return { ok, fail }
  }
}

class MacPlatformService implements PlatformService {
  getCwd(pid: number): string | null {
    try {
      const result = execSync(`lsof -p ${pid} -Fn 2>/dev/null | grep '^ncwd' | cut -c5-`, {
        timeout: 2000,
        encoding: 'utf-8'
      }).trim()
      return result || null
    } catch (err) {
      logger.debug('platform', `getCwd failed for pid ${pid}`, err)
      return null
    }
  }

  getClipboardFilePaths(): string[] {
    // TODO: implement macOS clipboard file paths
    return []
  }

  async restoreFromTrash(_originalPaths: string[]): Promise<{ ok: number; fail: number }> {
    // TODO: implement macOS trash restore
    return { ok: 0, fail: _originalPaths.length }
  }
}

class WindowsPlatformService implements PlatformService {
  getCwd(_pid: number): string | null {
    return null
  }

  getClipboardFilePaths(): string[] {
    return []
  }

  async restoreFromTrash(_originalPaths: string[]): Promise<{ ok: number; fail: number }> {
    return { ok: 0, fail: _originalPaths.length }
  }
}

export function createPlatformService(): PlatformService {
  switch (process.platform) {
    case 'darwin':
      return new MacPlatformService()
    case 'win32':
      return new WindowsPlatformService()
    default:
      return new LinuxPlatformService()
  }
}
