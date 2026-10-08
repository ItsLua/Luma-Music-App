import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose(): void
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId()
  useEffect(() => {
    const dialog = ref.current,
      focused = document.activeElement
    dialog?.showModal()
    if (!dialog?.classList.contains('now-playing')) window.dispatchEvent(new Event('luma:overlay'))
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previous
      if (focused instanceof HTMLElement) focused.focus()
    }
  }, [])
  return (
    <dialog
      className={`dialog ${className}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose()
        }
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  )
}
