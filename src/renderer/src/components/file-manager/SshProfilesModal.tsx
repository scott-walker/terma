import { useState } from 'react'
import { Trash2, Plus, Save, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { SshProfile } from '@shared/ssh-types'
import { useSettingsStore } from '@/stores/settings-store'

interface SshProfilesModalProps {
  onClose: () => void
}

const EMPTY_PROFILE: Omit<SshProfile, 'id'> = {
  name: '',
  host: '',
  port: 22,
  username: '',
  keyPath: '~/.ssh/id_ed25519',
  defaultPath: '~'
}

export function SshProfilesModal({ onClose }: SshProfilesModalProps): JSX.Element {
  const profiles = useSettingsStore((s) => s.settings.sshProfiles)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const [editingProfile, setEditingProfile] = useState<SshProfile | null>(null)
  const [isNew, setIsNew] = useState(false)

  const handleSave = async (): Promise<void> => {
    if (!editingProfile) return
    if (!editingProfile.name.trim() || !editingProfile.host.trim() || !editingProfile.username.trim()) return

    const updated = isNew
      ? [...profiles, editingProfile]
      : profiles.map((p) => (p.id === editingProfile.id ? editingProfile : p))

    await updateSettings({ sshProfiles: updated })
    setEditingProfile(null)
    setIsNew(false)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await updateSettings({ sshProfiles: profiles.filter((p) => p.id !== id) })
    if (editingProfile?.id === id) {
      setEditingProfile(null)
      setIsNew(false)
    }
  }

  const handleNew = (): void => {
    setEditingProfile({ id: nanoid(), ...EMPTY_PROFILE })
    setIsNew(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop" onMouseDown={onClose}>
      <div
        className="flex w-[500px] max-h-[80vh] flex-col rounded-lg bg-popup-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-fg">SSH Connections</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* Profile list */}
          {profiles.length === 0 && !editingProfile && (
            <p className="mb-4 text-sm text-fg-muted">No SSH profiles configured yet.</p>
          )}

          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`mb-2 flex items-center justify-between rounded-md border px-3 py-2 ${
                editingProfile?.id === profile.id ? 'border-accent/40 bg-surface-hover' : 'border-border'
              }`}
            >
              <button
                className="flex flex-1 flex-col text-left"
                onClick={() => { setEditingProfile({ ...profile }); setIsNew(false) }}
              >
                <span className="text-sm text-fg">{profile.name}</span>
                <span className="text-xs text-fg-muted">
                  {profile.username}@{profile.host}:{profile.port}
                </span>
              </button>
              <button
                onClick={() => handleDelete(profile.id)}
                className="ml-2 text-fg-muted hover:text-danger"
                title="Delete"
              >
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}

          {/* Edit form */}
          {editingProfile && (
            <div className="mt-4 space-y-3 rounded-md border border-border p-4">
              <h3 className="text-xs font-semibold uppercase text-fg-muted">
                {isNew ? 'New Profile' : 'Edit Profile'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Name</span>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    placeholder="My Server"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Host</span>
                  <input
                    type="text"
                    value={editingProfile.host}
                    onChange={(e) => setEditingProfile({ ...editingProfile, host: e.target.value })}
                    placeholder="192.168.1.100"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Port</span>
                  <input
                    type="number"
                    value={editingProfile.port}
                    onChange={(e) => setEditingProfile({ ...editingProfile, port: parseInt(e.target.value) || 22 })}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Username</span>
                  <input
                    type="text"
                    value={editingProfile.username}
                    onChange={(e) => setEditingProfile({ ...editingProfile, username: e.target.value })}
                    placeholder="root"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Key Path</span>
                  <input
                    type="text"
                    value={editingProfile.keyPath}
                    onChange={(e) => setEditingProfile({ ...editingProfile, keyPath: e.target.value })}
                    placeholder="~/.ssh/id_ed25519"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent/40"
                  />
                </label>

                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Default Path</span>
                  <input
                    type="text"
                    value={editingProfile.defaultPath}
                    onChange={(e) => setEditingProfile({ ...editingProfile, defaultPath: e.target.value })}
                    placeholder="/home/user"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent/40"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setEditingProfile(null); setIsNew(false) }}
                  className="rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingProfile.name.trim() || !editingProfile.host.trim() || !editingProfile.username.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm text-base transition-colors hover:opacity-90 disabled:opacity-40"
                >
                  <Save size={14} strokeWidth={1.8} />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-border px-5 py-3">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <Plus size={14} strokeWidth={1.8} />
            Add Profile
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
