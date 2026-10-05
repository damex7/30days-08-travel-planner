import { Section } from '../Section.jsx'
import { EmptyState, Skeleton } from '../States.jsx'
import { formatTemp, MONTHS, MONTHS_LONG } from '../../lib/format.js'
import { cx } from '../../lib/cx.js'

/*
  "What's it usually like in July?" Twelve months of averages from the
  last three years of Open-Meteo's historical archive. Useful when you're
  choosing WHEN to go, and the packing list uses it for trips too far
  ahead for a forecast. The current month is highlighted.
*/
export function TypicalYearSection({ state, onRetry, units }) {
  const thisMonth = new Date().getMonth() + 1
  return (
    <Section
      title="Typical year"
      stamp="Climate"
      icon="calendar"
      state={state}
      onRetry={onRetry}
      skeleton={
        <div role="status" aria-label="Loading typical weather" className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      }
      isEmpty={(data) => !data?.months?.some((m) => m.high != null)}
      empty={
        <EmptyState compact icon="calendar" title="No climate history">
          There’s no weather history for this spot.
        </EmptyState>
      }
    >
      {({ months, years }) => (
        <>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {months.map((m) => {
              const current = m.month === thisMonth
              return (
                <li
                  key={m.month}
                  className={cx(
                    'flex flex-col items-center rounded-lg border px-1 py-2 text-center',
                    current ? 'border-zobo bg-zobo-soft' : 'border-line',
                  )}
                >
                  <span className="sr-only">
                    {MONTHS_LONG[m.month - 1]}
                    {current ? ' (this month)' : ''}: average high {formatTemp(m.high, units)}, low {formatTemp(m.low, units)}, about{' '}
                    {m.rainyDays} rainy days.
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs tracking-wider text-ink-faint uppercase">
                    {MONTHS[m.month - 1]}
                  </span>
                  <span aria-hidden="true" className="mt-1 font-mono text-base font-medium">
                    {formatTemp(m.high, units)}
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs text-ink-soft">
                    {formatTemp(m.low, units)}
                  </span>
                  <span aria-hidden="true" className="mt-1 flex items-center gap-0.5 font-mono text-[0.7rem] text-sage" title="Rainy days">
                    <svg viewBox="0 0 10 12" className="size-2.5" fill="currentColor">
                      <path d="M5 0C5 0 0 5.6 0 8a5 5 0 0 0 10 0C10 5.6 5 0 5 0Z" />
                    </svg>
                    {m.rainyDays}d
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Average daily high and low, and days with at least 1 mm of rain, {years}. Historical data by{' '}
            <a className="underline underline-offset-2 hover:text-ink" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo.com
            </a>{' '}
            (ERA5, CC BY 4.0).
          </p>
        </>
      )}
    </Section>
  )
}
