import { useId, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cx } from './ui'

export function Accordion({
  open,
  onToggle,
  header,
  children,
  className,
  anchor,
}: {
  open: boolean
  onToggle: () => void
  header: ReactNode
  children: ReactNode
  className?: string
  /** Identifiant de l'accordéon, pour y conduire depuis un lien ou un sommaire. */
  anchor?: string
}) {
  const id = useId()
  return (
    <div id={anchor} className={cx('scroll-mt-24 rounded-2xl border border-line bg-surface shadow-soft', className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 sm:px-5"
        >
          <span className="min-w-0 flex-1">{header}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted">
            <ChevronDown className="size-5" aria-hidden="true" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
