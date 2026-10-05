import { useNow } from '../../hooks/useNow.js'
import { Icon } from '../Icon.jsx'
import { describeDiff, diffFromLagos, formatClock, formatLocalDate, LAGOS, offsetLabel, seasonalNote } from '../../lib/time.js'

/*
  Local time vs Lagos. No API call: the browser's Intl data already knows
  every timezone and its daylight-saving rules, and the timezone name
  ("Africa/Nairobi") came with the place from step ①. That's why this
  section can never be in an error state.
*/
export function TimeSection({ place }) {
  const now = useNow()
  const diff = diffFromLagos(place.timezone, now)
  const note = seasonalNote(place.timezone, now)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: place.timezone, hour: 'numeric', hourCycle: 'h23' }).format(now))
  const asleep = hour >= 22 || hour < 7

  return (
    <section aria-labelledby="time-title" className="pass p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 id="time-title" className="flex items-center gap-2 text-2xl">
          <Icon name="clock" className="size-5 text-zobo-ink" /> Time
        </h2>
        <span className="stamp text-saffron-ink">{offsetLabel(place.timezone, now)}</span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Clock label={place.name} time={formatClock(place.timezone, now)} date={formatLocalDate(place.timezone, now)} highlight />
        <Clock label="Lagos" time={formatClock(LAGOS, now)} date={formatLocalDate(LAGOS, now)} />
      </div>

      <p className="mt-4 text-lg font-bold">{describeDiff(diff)}</p>
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
      {asleep && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-saffron-soft p-2.5 text-sm text-ink">
          <Icon name="moon" className="mt-0.5 size-4 shrink-0 text-saffron-ink" />
          It’s night in {place.name}. Maybe don’t call your host just now.
        </p>
      )}
    </section>
  )
}

function Clock({ label, time, date, highlight }) {
  return (
    <div className={highlight ? 'rounded-xl bg-zobo-soft p-3' : 'rounded-xl border border-line p-3'}>
      <p className="truncate font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium">
        <time>{time}</time>
      </p>
      <p className="truncate text-xs text-ink-soft">{date}</p>
    </div>
  )
}
