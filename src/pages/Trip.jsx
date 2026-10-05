import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrips } from '../context/TripsContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useUnits, useUnitsSearch } from '../hooks/useUnits.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { getForecast, getTypicalYear } from '../lib/api/weather.js'
import { getNairaRates, convert } from '../lib/api/rates.js'
import { getCountry } from '../lib/api/countries.js'
import { activitiesOutside, daysUntil, nights, setDates, setPacking, toShareText, tripDates, tripStatus, tripTotal } from '../lib/trips.js'
import { buildPackingList, summariseForTrip } from '../lib/packing.js'
import { formatDateRange, formatLocalMoney, formatMoney } from '../lib/format.js'
import { copyText } from '../lib/share.js'
import { DayPlan } from '../components/trip/DayPlan.jsx'
import { TripForm } from '../components/trip/TripForm.jsx'
import { PackingList } from '../components/PackingList.jsx'
import { EmptyState, ErrorState, SkeletonBlock } from '../components/States.jsx'
import { Flag } from '../components/Flag.jsx'
import { Icon } from '../components/Icon.jsx'

export default function Trip() {
  const { tripId } = useParams()
  const { getTrip } = useTrips()
  const trip = getTrip(tripId)
  useDocumentTitle(trip?.name ?? 'Trip not found')

  if (!trip) {
    return (
      <EmptyState
        title="We couldn’t find that trip"
        icon="suitcase"
        action={
          <Link to="/trips" className="inline-flex min-h-11 items-center rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover">
            See my trips
          </Link>
        }
      >
        Trips are saved in this browser only, so a trip made on another device or browser won’t show up here.
      </EmptyState>
    )
  }
  // key: switching between trips starts fresh (forms closed, new requests)
  return <TripPlanner key={trip.id} trip={trip} />
}

/*
  The trip's own data comes from the trip (saved offline). The network is
  only needed for extras, and each extra fails on its own:
  - rates: to show totals in Naira (the local-currency total always works)
  - weather: forecast AND typical year, fetched together with
    Promise.allSettled. The packing list needs either one, so it only
    fails if BOTH did.
  - country: only if the trip was saved without a currency (the country
    request had failed when you created it).
*/
function useTripData(trip) {
  const place = trip.place
  const rates = useAsync((signal) => getNairaRates({ signal }), [])
  const weather = useAsync(
    (signal) =>
      Promise.allSettled([getForecast(place, { signal }), getTypicalYear(place, { signal })]).then(([forecast, typical]) => {
        if (forecast.status === 'rejected' && typical.status === 'rejected') throw forecast.reason
        return {
          forecastDays: forecast.status === 'fulfilled' ? forecast.value.days : [],
          typicalMonths: typical.status === 'fulfilled' ? typical.value.months : [],
        }
      }),
    [place.id],
  )
  const country = useAsync(trip.currency ? null : (signal) => getCountry(place.countryCode, { signal }), [place.countryCode, Boolean(trip.currency)])
  const currency = trip.currency ?? country.data?.currencies?.[0] ?? null
  return { rates, weather, currency }
}

function TripPlanner({ trip }) {
  const navigate = useNavigate()
  const { saveTrip, deleteTrip } = useTrips()
  const [units] = useUnits()
  const unitsSearch = useUnitsSearch()
  const { rates, weather, currency } = useTripData(trip)
  const [editingDates, setEditingDates] = useState(false)
  const [copied, setCopied] = useState('')

  const code = currency?.code ?? null

  // A trip saved before its country loaded has no currency: store it once we know it
  useEffect(() => {
    if (!trip.currency && currency) saveTrip({ ...trip, currency: { code: currency.code, name: currency.name, symbol: currency.symbol } })
  }, [trip, currency, saveTrip])
  const status = tripStatus(trip)
  const until = daysUntil(trip)
  const n = nights(trip)

  async function share() {
    const ok = await copyText(toShareText({ ...trip, currency }, rates.data))
    setCopied(ok ? 'Copied. Paste it into WhatsApp.' : 'Couldn’t copy. Your browser blocked the clipboard.')
    setTimeout(() => setCopied(''), 4000)
  }

  function remove() {
    if (!window.confirm(`Delete “${trip.name}”? This can’t be undone.`)) return
    deleteTrip(trip.id)
    navigate({ pathname: '/trips', search: unitsSearch })
  }

  function changeDates({ startDate, endDate }) {
    const lost = activitiesOutside(trip, startDate, endDate)
    if (lost && !window.confirm(`${lost} ${lost === 1 ? 'activity is' : 'activities are'} on days outside the new dates and will be deleted. Continue?`)) return
    saveTrip(setDates(trip, startDate, endDate))
    setEditingDates(false)
  }

  return (
    <article className="space-y-6">
      <Link to={{ pathname: '/trips', search: unitsSearch }} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <Icon name="back" className="size-4" /> My trips
      </Link>

      {/* Boarding pass header */}
      <header className="pass overflow-hidden">
        <div className="route-band px-5 py-5 text-[#fff7ef] sm:px-8">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase opacity-90">
            Lagos <Icon name="plane" className="size-4 text-[#f2b84b]" /> {trip.place.name}
          </p>
          <h1 className="mt-2 text-4xl leading-tight break-words sm:text-5xl">{trip.name}</h1>
          <p className="mt-1 flex items-center gap-2">
            <Flag code={trip.place.countryCode} />
            <Link to={{ pathname: `/place/${trip.place.id}`, search: unitsSearch }} className="underline underline-offset-4 hover:no-underline">
              {trip.place.label}
            </Link>
          </p>
        </div>
        <div className="perforation" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 sm:px-8">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">Dates</dt>
              <dd className="font-mono text-lg font-medium">{formatDateRange(trip.startDate, trip.endDate)}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">Length</dt>
              <dd className="font-mono text-lg font-medium">
                {n} {n === 1 ? 'night' : 'nights'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">Status</dt>
              <dd className="font-mono text-lg font-medium">
                {status === 'upcoming' ? (until === 1 ? 'Tomorrow' : `In ${until} days`) : status === 'ongoing' ? 'Happening now' : 'Done'}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditingDates((v) => !v)}
              aria-expanded={editingDates}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 font-bold hover:border-zobo"
            >
              <Icon name="calendar" className="size-4" /> Change dates
            </button>
            <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-zobo px-4 font-bold text-on-zobo hover:bg-zobo-hover">
              <Icon name="copy" className="size-4" /> Copy as text
            </button>
            <button
              type="button"
              onClick={remove}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-bold text-danger hover:bg-danger-soft"
            >
              <Icon name="trash" className="size-4" /> Delete
            </button>
          </div>
        </div>
        <p aria-live="polite" className="px-5 pb-3 text-sm font-bold text-sage empty:hidden sm:px-8">
          {copied}
        </p>
        {editingDates && (
          <div className="border-t border-line px-5 py-4 sm:px-8">
            <TripForm initial={trip} showName={false} submitLabel="Save dates" onSubmit={changeDates} onCancel={() => setEditingDates(false)} />
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="plan-title" className="min-w-0 space-y-4">
          <h2 id="plan-title" className="text-3xl">
            Day by day
          </h2>
          {tripDates(trip).map((date, i) => (
            <DayPlan key={date} trip={trip} date={date} index={i} currencyCode={code} onChange={saveTrip} />
          ))}
        </section>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
          <CostCard trip={trip} code={code} rates={rates} />
        </aside>
      </div>

      <section aria-labelledby="trip-packing" className="pass p-5 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trip-packing" className="flex items-center gap-2 text-2xl">
            <Icon name="suitcase" className="size-5 text-zobo-ink" /> Packing list
          </h2>
          <span className="stamp text-saffron-ink">This trip</span>
        </header>
        {weather.status === 'loading' ? (
          <SkeletonBlock label="packing list" lines={6} />
        ) : weather.status === 'error' ? (
          <ErrorState compact title="Can’t build the list without weather" error={weather.error} onRetry={weather.retry} />
        ) : (
          <TripPacking trip={trip} weather={weather.data} units={units} code={code} onChange={(packing) => saveTrip(setPacking(trip, packing))} />
        )}
      </section>
    </article>
  )
}

function TripPacking({ trip, weather, units, code, onChange }) {
  const summary = summariseForTrip({ ...weather, startDate: trip.startDate, endDate: trip.endDate })
  const note = !summary
    ? 'No weather for these dates yet, so this is just the essentials.'
    : summary.source === 'forecast'
      ? `Built from the forecast for your ${summary.dayCount} ${summary.dayCount === 1 ? 'day' : 'days'} in ${trip.place.name}.`
      : `Your trip is beyond the 7-day forecast, so this uses typical weather for ${trip.place.name} at that time of year.`
  return (
    <>
      <p className="mb-4 text-sm text-ink-soft">{note}</p>
      <PackingList generated={buildPackingList(summary, { units, currencyCode: code })} saved={trip.packing} onChange={onChange} />
    </>
  )
}

/*
  Total estimated cost. The local total only needs the trip itself, so it
  always shows. The Naira total needs the rates request; if that failed,
  only the Naira line shows an error with Retry.
*/
function CostCard({ trip, code, rates }) {
  const total = tripTotal(trip)
  let naira
  if (!code || code === 'NGN') naira = null
  else if (rates.status === 'loading') naira = <span className="inline-block h-6 w-28 animate-shimmer rounded bg-panel-2 align-middle" aria-label="Loading rate" />
  else if (rates.status === 'error')
    naira = (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-danger">Naira total unavailable: rates didn’t load.</span>
        <button type="button" onClick={rates.retry} className="min-h-11 rounded-full bg-zobo px-4 font-bold text-on-zobo hover:bg-zobo-hover">
          Retry
        </button>
      </span>
    )
  else {
    const value = convert(total, code, 'NGN', rates.data)
    naira = value == null ? <span className="text-sm text-ink-faint">No Naira rate for {code}.</span> : <>≈ {formatMoney(value, 'NGN')}</>
  }

  return (
    <section aria-labelledby="cost-title" className="pass p-5 sm:p-6">
      <h2 id="cost-title" className="flex items-center gap-2 text-2xl">
        <Icon name="coins" className="size-5 text-zobo-ink" /> Estimated cost
      </h2>
      <p className="mt-3 font-mono text-3xl font-medium">{formatLocalMoney(total, code)}</p>
      {naira && <div className="mt-1 font-mono text-xl text-ink-soft">{naira}</div>}
      <p className="mt-3 text-xs text-ink-faint">
        The sum of the costs you’ve added to activities{code ? ` in ${code}` : ''}. Naira at today’s mid-market rate; flights and hotels aren’t included.
      </p>
    </section>
  )
}
