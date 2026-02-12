import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

export function Modal({ isOpen, onClose, children, title, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
<div className={`relative max-h-[92vh] w-full ${sizeClasses[size]} rounded-2xl border border-ink/10 bg-white shadow-soft flex flex-col md:max-h-[90vh] md:rounded-3xl`}>
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0 md:px-6 md:py-4">
            <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-ink/60 transition hover:bg-ink/10 hover:text-ink"
              aria-label="Cerrar modal"
            >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
</div>
)
}
