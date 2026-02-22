import { SSH_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { SshService } from '../ssh/ssh-service'
import { typedHandle } from './handlers'

export function registerSshHandlers(sshService: SshService): void {
  typedHandle(SSH_CHANNELS.CONNECT, async (_event, profileId: string) => {
    const settings = SettingsService.getAll()
    const profile = settings.sshProfiles.find((p) => p.id === profileId)
    if (!profile) throw new Error(`SSH profile not found: ${profileId}`)
    await sshService.connect(profile)
  })

  typedHandle(SSH_CHANNELS.DISCONNECT, async (_event, profileId: string) => {
    await sshService.disconnect(profileId)
  })

  typedHandle(SSH_CHANNELS.READ_DIR, async (_event, profileId: string, remotePath: string) => {
    return sshService.readDir(profileId, remotePath)
  })

  typedHandle(SSH_CHANNELS.GET_HOME_DIR, async (_event, profileId: string) => {
    return sshService.getHomeDir(profileId)
  })
}
