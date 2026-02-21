import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            color: '#555a70',
            fontSize: 12,
            padding: 16
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8, color: '#ef4444' }}>Component error</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                marginTop: 12,
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid #1e2130',
                color: '#555a70',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
