import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'

/*
  The three states every data view needs besides "here's your data":
  - loading: skeletons shaped like the real content, so nothing jumps
  - error: what went wrong, which service, and a Retry for just that part
  - empty: why there's nothing, and what to try instead
*/

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('animate-shimmer rounded-md bg-panel-2', className)} />
}

/** Lines of text-shaped skeleton. Announces "Loading <label>" once. */
export function SkeletonBlock({ label, lines = 3, className }) {
  return (
    <div role="status" aria-label={`Loading ${label}`} className={cx('space-y-2.5', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function ErrorState({ title = "This part didn't load", error, onRetry, compact = false }) {
  return (
    <div
      role="alert"
      className={cx(
        'rounded-xl border-2 border-dashed border-danger/40 bg-danger-soft text-center',
        compact ? 'p-4' : 'mx-auto max-w-md p-6',
      )}
    >
      <Icon name="alert" className={cx('mx-auto text-danger', compact ? 'size-6' : 'size-8')} />
      <p className={cx('mt-2 font-bold', compact ? 'text-base' : 'text-xl')}>{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-zobo px-5 text-sm font-bold text-on-zobo hover:bg-zobo-hover"
        >
          <Icon name="retry" className="size-4" /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action, icon = 'map', compact = false }) {
  return (
    <div className={cx('rounded-xl border-2 border-dashed border-line text-center', compact ? 'p-4' : 'mx-auto max-w-md p-6')}>
      <Icon name={icon} className={cx('mx-auto text-saffron-ink', compact ? 'size-6' : 'size-9')} />
      <p className={cx('mt-2 font-bold', compact ? 'text-base' : 'text-xl')}>{title}</p>
      {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
