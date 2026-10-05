import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrips } from '../context/TripsContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useUnitsSearch } from '../hooks/useUnits.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { getNairaRates } from '../lib/api/rates.js'
import { activityCount, daysUntil, lagosToday, nights, toShareText, tripStatus, tripTotal } from '../lib/trips.js'
import { formatDateRange, formatLocalMoney } from '../lib/format.js'
import { copyText, downloadJSON } from '../lib/share.js'
import { EmptyState } from '../components/States.jsx'
import { Flag } from '../components/Flag.jsx'
import { Icon } from '../components/Icon.jsx'
import { cx } from '../lib/cx.js'

/*
  Every saved trip (localStorage, so this works offline). Upcoming trips
  first. Export downloads all of them as JSON, a backup you can keep;
  "Copy as text" gives a summary to paste into WhatsApp.
*/
export default function Trips() {
  useDocumentTitle('My trips')
  const { trips, deleteTrip } = useTrips()
  const unitsSearch = useUnitsSearch()
  // Rates only add "≈ ₦…" to copied summaries; if they fail, summaries still copy without it
  const rates = useAsync(trips.length ? (signal) => getNairaRates({ signal }) : null, [trips.length > 0])
  const [message, setMessage] = useState('')

  function flash(text) {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  async function copy(trip) {
    const ok = await copyText(toShareText(trip, rates.data))
    flash(ok ? `Copied “${trip.name}”. Paste it into WhatsApp.` : 'Couldn’t copy. Your browser blocked the clipboard.')
  }

  function exportAll() {
    downloadJSON(`passport-trips-${lagosToday()}.json`, { app: 'Passport', exportedAt: new Date().toISOString(), trips })
    flash(`Downloaded ${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} as JSON.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="stamp text-saffron-ink">Saved on this device</p>
          <h1 className="mt-3 text-5xl">My trips</h1>
        </div>
        {trips.length > 0 && (
          <button
            type="button"
            onClick={exportAll}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-panel px-4 font-bold hover:border-zobo"
          >
            <Icon name="download" className="size-4" /> Export JSON
          </button>
        )}
      </div>

      <p aria-live="polite" className="font-bold text-sage empty:hidden">
        {message}
      </p>

      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          icon="suitcase"
          action={
            <Link
              to={{ pathname: '/', search: unitsSearch }}
              className="inline-flex min-h-11 items-center rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover"
            >
              Find a destination
            </Link>
          }
        >
          Search for a city, then press “Plan a trip” on its page.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard
                trip={trip}
                search={unitsSearch}
                onCopy={() => copy(trip)}
                onDelete={() => {
                  if (window.confirm(`Delete “${trip.name}”? This can’t be undone.`)) deleteTrip(trip.id)
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TripCard({ trip, search, onCopy, onDelete }) {
  const status = tripStatus(trip)
  const until = daysUntil(trip)
  const count = activityCount(trip)
  const total = tripTotal(trip)
  const n = nights(trip)
  const badge = status === 'upcoming' ? (until === 1 ? 'Tomorrow' : `In ${until} days`) : status === 'ongoing' ? 'Now' : 'Past'

  return (
    <article className={cx('pass flex h-full flex-col overflow-hidden', status === 'past' && 'opacity-80')}>
      <div className="flex-1 p-5">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-faint uppercase">
          <span>LOS</span>
          <span aria-hidden="true" className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
          <Icon name="plane" className="size-4 text-zobo-ink" />
          <span aria-hidden="true" className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
          <span className="text-ink">{trip.place.name}</span>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h2 className="text-2xl leading-tight break-words">
            <Link to={{ pathname: `/trips/${trip.id}`, search }} className="hover:underline">
              {trip.name}
            </Link>
          </h2>
          <span
            className={cx(
              'shrink-0 rounded-md px-2 py-0.5 font-mono text-xs',
              status === 'ongoing' ? 'bg-sage-soft text-sage' : status === 'past' ? 'bg-panel-2 text-ink-soft' : 'bg-saffron-soft text-saffron-ink',
            )}
          >
            {badge}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
          <Flag code={trip.place.countryCode} /> {trip.place.label}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">Dates</dt>
            <dd className="font-medium">{formatDateRange(trip.startDate, trip.endDate)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">Plan</dt>
            <dd className="font-medium">
              {n} {n === 1 ? 'night' : 'nights'}, {count} {count === 1 ? 'activity' : 'activities'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">Est. cost</dt>
            <dd className="font-mono font-medium">{total ? formatLocalMoney(total, trip.currency?.code) : '–'}</dd>
          </div>
        </dl>
      </div>
      <div className="perforation" />
      <div className="flex flex-wrap items-center gap-1 px-3 py-2">
        <Link
          to={{ pathname: `/trips/${trip.id}`, search }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-bold text-zobo-ink hover:bg-zobo-soft"
        >
          Open plan <Icon name="arrow" className="size-4" />
        </Link>
        <button type="button" onClick={onCopy} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-bold text-ink-soft hover:bg-panel-2">
          <Icon name="copy" className="size-4" /> Copy as text
          <span className="sr-only"> for {trip.name}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto grid size-11 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
        >
          <Icon name="trash" className="size-4" />
          <span className="sr-only">Delete {trip.name}</span>
        </button>
      </div>
    </article>
  )
}
