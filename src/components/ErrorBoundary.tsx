import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logger } from '../services/logger'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('render-failed', { error, info })
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <img src="/favicon.svg" width="56" height="56" alt="Luma" />
        <h1>Something went wrong</h1>
        <p>Your saved library is still on this device. Reload Luma to try again.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload Luma
        </button>
      </main>
    ) : (
      this.props.children
    )
  }
}
