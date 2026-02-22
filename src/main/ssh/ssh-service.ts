import { Client, type SFTPWrapper } from 'ssh2'
import { readFileSync } from 'fs'
import type { FileEntry } from '../../shared/types'
import type { SshProfile } from '../../shared/ssh-types'
import { logger } from '../services/logger-service'

const CONNECT_TIMEOUT = 10_000
const SFTP_TIMEOUT = 15_000
const DIR_CACHE_MAX = 20
const DIR_CACHE_TTL = 10_000

interface SshConnection {
  client: Client
  sftp: SFTPWrapper
}

/** Simple LRU cache with TTL for readDir results */
class DirCache {
  private entries = new Map<string, { data: FileEntry[]; ts: number }>()

  get(key: string): FileEntry[] | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > DIR_CACHE_TTL) {
      this.entries.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.data
  }

  set(key: string, data: FileEntry[]): void {
    this.entries.delete(key)
    if (this.entries.size >= DIR_CACHE_MAX) {
      // Evict oldest (first entry)
      const first = this.entries.keys().next().value
      if (first !== undefined) this.entries.delete(first)
    }
    this.entries.set(key, { data, ts: Date.now() })
  }

  /** Invalidate all entries for a given profileId */
  invalidate(profileId: string): void {
    const prefix = profileId + ':'
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key)
      }
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

export class SshService {
  private connections = new Map<string, SshConnection>()
  private dirCache = new DirCache()

  async connect(profile: SshProfile): Promise<void> {
    if (this.connections.has(profile.id)) {
      logger.info('ssh', `Already connected: ${profile.name}`)
      return
    }

    const client = new Client()
    const privateKey = readFileSync(profile.keyPath.replace(/^~/, process.env.HOME || ''))

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        client.on('ready', () => resolve())
        client.on('error', (err) => {
          logger.error('ssh', `Connection error: ${profile.host}`, err.message)
          reject(err)
        })
        client.connect({
          host: profile.host,
          port: profile.port,
          username: profile.username,
          privateKey,
          readyTimeout: CONNECT_TIMEOUT
        })
      }),
      CONNECT_TIMEOUT,
      `SSH connect ${profile.host}`
    )

    // Auto-remove on unexpected close
    client.on('close', () => {
      if (this.connections.has(profile.id)) {
        this.connections.delete(profile.id)
        this.dirCache.invalidate(profile.id)
        logger.warn('ssh', `Connection closed unexpectedly: ${profile.id}`)
      }
    })

    client.on('error', (err) => {
      logger.error('ssh', `Connection error (post-connect): ${profile.id}`, err.message)
      this.connections.delete(profile.id)
      this.dirCache.invalidate(profile.id)
    })

    const sftp = await withTimeout(
      new Promise<SFTPWrapper>((resolve, reject) => {
        client.sftp((err, sftp) => {
          if (err) reject(err)
          else resolve(sftp)
        })
      }),
      SFTP_TIMEOUT,
      `SFTP init ${profile.host}`
    )

    this.connections.set(profile.id, { client, sftp })
    logger.info('ssh', `Connected to ${profile.host}`)
  }

  async disconnect(profileId: string): Promise<void> {
    const conn = this.connections.get(profileId)
    if (!conn) return
    this.connections.delete(profileId)
    this.dirCache.invalidate(profileId)
    conn.client.end()
    logger.info('ssh', `Disconnected: ${profileId}`)
  }

  async readDir(profileId: string, remotePath: string): Promise<FileEntry[]> {
    const conn = this.connections.get(profileId)
    if (!conn) throw new Error(`Not connected: ${profileId}`)

    const cacheKey = profileId + ':' + remotePath
    const cached = this.dirCache.get(cacheKey)
    if (cached) return cached

    const list = await withTimeout(
      new Promise<FileEntry[]>((resolve, reject) => {
        conn.sftp.readdir(remotePath, (err, list) => {
          if (err) { reject(err); return }

          const entries: FileEntry[] = list.map((item) => {
            const isDirectory = (item.attrs.mode & 0o170000) === 0o040000
            const isSymlink = (item.attrs.mode & 0o170000) === 0o120000
            const fullPath = remotePath === '/' ? `/${item.filename}` : `${remotePath}/${item.filename}`
            return {
              name: item.filename,
              path: fullPath,
              isDirectory,
              isSymlink,
              size: item.attrs.size,
              modified: (item.attrs.mtime ?? 0) * 1000
            }
          })

          entries.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
            return a.name.localeCompare(b.name)
          })

          resolve(entries)
        })
      }),
      SFTP_TIMEOUT,
      `SFTP readdir ${remotePath}`
    )

    this.dirCache.set(cacheKey, list)
    return list
  }

  async getHomeDir(profileId: string): Promise<string> {
    const conn = this.connections.get(profileId)
    if (!conn) throw new Error(`Not connected: ${profileId}`)

    return withTimeout(
      new Promise<string>((resolve, reject) => {
        conn.sftp.realpath('.', (err, absPath) => {
          if (err) reject(err)
          else resolve(absPath)
        })
      }),
      SFTP_TIMEOUT,
      `SFTP realpath ${profileId}`
    )
  }

  isConnected(profileId: string): boolean {
    return this.connections.has(profileId)
  }

  disconnectAll(): void {
    for (const [id, conn] of this.connections) {
      conn.client.end()
      logger.info('ssh', `Disconnected on cleanup: ${id}`)
    }
    this.connections.clear()
    this.dirCache.clear()
  }
}
