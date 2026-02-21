import { Settings } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div
      className="flex shrink-0 items-center border-b border-border"
      style={{
        padding: '10px 20px',
        gap: 14,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}
    >
      {/* Logo — gradient text */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          background: 'linear-gradient(135deg, #00d25b, #57caeb)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -0.5
        }}
      >
        terma
      </div>

      <div style={{ flex: 1 }} />

      {/* Right: settings + window controls */}
      <div
        className="flex items-center"
        style={{ gap: 12, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={toggleSettings}
          title="Settings (Ctrl+Shift+,)"
          className="text-fg-muted"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            lineHeight: 1
          }}
        >
          <Settings size={16} strokeWidth={1.8} />
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <div
            onClick={() => window.api.window.minimize()}
            title="Minimize"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#ffab00',
              opacity: 0.7,
              cursor: 'pointer'
            }}
          />
          <div
            onClick={() => window.api.window.maximize()}
            title="Maximize"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#00d25b',
              opacity: 0.7,
              cursor: 'pointer'
            }}
          />
          <div
            onClick={() => window.api.window.close()}
            title="Close"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fc424a',
              opacity: 0.7,
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
    </div>
  )
}
