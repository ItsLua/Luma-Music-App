import { useToast } from '../stores/toastStore'
import { CircleAlert, RefreshCw, Music2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
export function Toast() {
  const { text, sequence } = useToast()
  useEffect(() => {
    const timer = setTimeout(() => useToast.setState({ text: '' }), 3500)
    return () => clearTimeout(timer)
  }, [sequence])
  return (
    <div className={`toast ${text ? 'visible' : ''}`} role="status">
      {text}
    </div>
  )
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="empty-state error-state" role="alert">
      <CircleAlert />
      <h3>Let’s try that again</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  )
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Music2 />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  )
}
export function Skeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid" role="status" aria-label="Loading music">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton cover" />
          <div className="skeleton line" />
          <div className="skeleton line short" />
        </div>
      ))}
    </div>
  )
}
