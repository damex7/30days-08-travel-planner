import { useId } from 'react'
import { ErrorState, SkeletonBlock } from './States.jsx'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'

/*
  One card on the destination page. Every section has the same four
  states, and this component picks which one to show, so each section
  only has to describe its own content:

    loading → `skeleton` (or generic lines)
    error   → ErrorState with a Retry that re-runs only this section
    empty   → `empty`, when isEmpty(data) says there's nothing to show
    success → children(data)

  `credit` is the source attribution shown under the content.
*/
export function Section({
  title,
  stamp,
  icon,
  state,
  onRetry,
  skeleton,
  isEmpty = (data) => data == null,
  empty,
  credit,
  className,
  errorTitle,
  children,
}) {
  const headingId = useId()
  const { status, data, error } = state

  let body
  if (status === 'loading') body = skeleton ?? <SkeletonBlock label={title} lines={4} />
  else if (status === 'error') body = <ErrorState compact title={errorTitle ?? `${title} didn't load`} error={error} onRetry={onRetry} />
  else if (isEmpty(data)) body = empty
  else body = <div className="animate-fade-in">{children(data)}</div>

  return (
    <section aria-labelledby={headingId} aria-busy={status === 'loading'} className={cx('pass flex flex-col p-5 sm:p-6', className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="flex items-center gap-2 text-2xl leading-tight">
          {icon && <Icon name={icon} className="size-5 text-zobo-ink" />}
          {title}
        </h2>
        {stamp && <span className="stamp text-saffron-ink">{stamp}</span>}
      </header>
      <div className="flex-1">{body}</div>
      {credit && status === 'success' && <p className="mt-4 text-xs text-ink-faint">{credit}</p>}
    </section>
  )
}
