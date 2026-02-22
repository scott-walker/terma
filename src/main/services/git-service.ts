import { execFile } from 'child_process'
import { basename } from 'path'

export interface GitInfo {
  repo: string
  branch: string
  url: string | null
}

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 3000 }, (err, stdout) => {
      if (err) return reject(err)
      resolve(stdout.trim())
    })
  })
}

function remoteToHttps(raw: string): string | null {
  // git@github.com:user/repo.git → https://github.com/user/repo
  const ssh = raw.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`
  // https://github.com/user/repo.git → strip .git
  if (raw.startsWith('https://') || raw.startsWith('http://')) {
    return raw.replace(/\.git$/, '')
  }
  return null
}

export interface BranchEntry {
  name: string
  current: boolean
  isRemote: boolean
}

export async function listBranches(cwd: string): Promise<BranchEntry[]> {
  const raw = await git(cwd, ['branch', '-a', '--sort=-committerdate'])
  return raw
    .split('\n')
    .filter((l) => l.trim() !== '')
    .filter((l) => !l.includes('->')) // skip HEAD -> origin/main aliases
    .map((line) => {
      const current = line.startsWith('* ')
      const name = line.replace(/^\*?\s+/, '').trim()
      const isRemote = name.startsWith('remotes/')
      return { name: isRemote ? name.replace(/^remotes\//, '') : name, current, isRemote }
    })
}

export async function checkoutBranch(cwd: string, branch: string): Promise<void> {
  // If it's a remote branch like origin/foo, checkout as local tracking branch
  const match = branch.match(/^([^/]+)\/(.+)$/)
  if (match) {
    const localName = match[2]
    await git(cwd, ['checkout', '-b', localName, '--track', branch])
  } else {
    await git(cwd, ['checkout', branch])
  }
}

export async function createBranch(cwd: string, name: string): Promise<void> {
  await git(cwd, ['checkout', '-b', name])
}

export async function getGitInfo(cwd: string): Promise<GitInfo | null> {
  try {
    const [toplevel, branch] = await Promise.all([
      git(cwd, ['rev-parse', '--show-toplevel']),
      git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
    ])
    let url: string | null = null
    try {
      const raw = await git(cwd, ['remote', 'get-url', 'origin'])
      url = remoteToHttps(raw)
    } catch { /* no remote — ok */ }
    return { repo: basename(toplevel), branch, url }
  } catch {
    return null
  }
}
