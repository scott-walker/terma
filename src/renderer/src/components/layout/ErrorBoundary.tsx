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
        <div className="flex h-full w-full items-center justify-center p-4 text-xs text-fg-muted">
          <div className="text-center">
            <div className="mb-2 text-danger">Component error</div>
            <div className="text-[11px] opacity-70">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1 text-[11px] text-fg-muted"
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
