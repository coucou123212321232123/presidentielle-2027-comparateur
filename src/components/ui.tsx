import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Badge({
  children,
  tone = 'neutral',
  title,
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'blue' | 'violet' | 'amber' | 'teal' | 'green' | 'rose' | 'new'
  title?: string
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2 ring-line',
    blue: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900',
    violet: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900',
    teal: 'bg-teal-50 text-teal-900 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-900',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900',
    rose: 'bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900',
    new: 'bg-red-600 text-white ring-red-600 dark:bg-red-500 dark:ring-red-500',
  }
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Chip({
  active,
  onClick,
  children,
  color,
  className,
  disabled,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  color?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      style={active && color ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? color
            ? 'bg-surface text-ink'
            : 'border-ink bg-ink text-bg'
          : 'border-line bg-surface text-ink-2 hover:border-ink-2/40 hover:text-ink',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cx('rounded-2xl border border-line bg-surface shadow-soft', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-base leading-relaxed text-ink-2">{children}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-medium text-ink-2">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-surface-2', className)} aria-hidden="true" />
}
