// Cross-platform path utilities for renderer & shared code.
// Handles both '/' (Unix) and '\' (Windows) separators.

const SEP = /[\\/]/

export function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  if (i <= 0) return p.length > 0 && p[0] === '/' ? '/' : p.substring(0, p.indexOf('\\') + 1) || '/'
  // Preserve drive root: 'C:\' stays 'C:\'
  if (i === 2 && p[1] === ':') return p.substring(0, 3)
  return p.substring(0, i)
}

export function baseName(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return p.substring(i + 1)
}

export function isAbsolute(p: string): boolean {
  if (p.startsWith('/')) return true
  // Windows: C:\ or C:/
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true
  // UNC: \\server
  if (p.startsWith('\\\\')) return true
  return false
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/')
}

export function normalizePath(p: string): string {
  const parts = p.split(SEP).filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    else if (part === '..') stack.pop()
    else stack.push(part)
  }
  // Preserve leading slash for absolute paths
  const prefix = p.startsWith('/') ? '/' : /^[a-zA-Z]:[\\/]/.test(p) ? p.substring(0, 2) + '/' : ''
  return prefix + stack.join('/')
}

export function relativePath(from: string, to: string): string {
  const fromParts = from.split(SEP).filter(Boolean)
  const toParts = to.split(SEP).filter(Boolean)
  let i = 0
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++
  const ups = fromParts.length - i
  const rest = toParts.slice(i)
  const rel = [...Array<string>(ups).fill('..'), ...rest].join('/')
  if (!rel) return '.'
  if (!rel.startsWith('.')) return './' + rel
  return rel
}

// Platform detection — works in both renderer (navigator) and preload (process)
export const isMac =
  typeof navigator !== 'undefined'
    ? /Mac|iPhone|iPad/.test(navigator.platform)
    : typeof process !== 'undefined' && process.platform === 'darwin'

export const isWindows =
  typeof navigator !== 'undefined'
    ? /Win/.test(navigator.platform)
    : typeof process !== 'undefined' && process.platform === 'win32'

export function isModKey(e: KeyboardEvent | { metaKey: boolean; ctrlKey: boolean }): boolean {
  return isMac ? e.metaKey : e.ctrlKey
}

export function shellEscape(s: string): string {
  if (isWindows) {
    if (/^[a-zA-Z0-9._\-\\/:=@]+$/.test(s)) return s
    return '"' + s.replace(/"/g, '`"') + '"'
  }
  if (/^[a-zA-Z0-9._\-/=@:]+$/.test(s)) return s
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
