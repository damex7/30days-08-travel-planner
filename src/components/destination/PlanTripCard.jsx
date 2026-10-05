import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTrips } from '../../context/TripsContext.jsx'
import { useUnitsSearch } from '../../hooks/useUnits.js'
import { createTrip } from '../../lib/trips.js'
import { formatDateRange } from '../../lib/format.js'
import { TripForm } from '../trip/TripForm.jsx'
import { Icon } from '../Icon.jsx'

/*
  "Plan a trip here": pick dates, and a trip is saved with a snapshot of
  this place and its currency, then the planner opens. If the country
  request failed, the trip is saved without a currency and the planner
  looks it up later.
*/
export function PlanTripCard({ place, country }) {
  const navigate = useNavigate()
  const search = useUnitsSearch()
  const { trips, saveTrip } = useTrips()
  const [open, setOpen] = useState(false)
  const existing = trips.filter((t) => t.place.id === place.id)

  function create({ startDate, endDate, name }) {
    const trip = createTrip({ place, currency: country?.currencies?.[0] ?? null, startDate, endDate, name })
    saveTrip(trip)
    navigate({ pathname: `/trips/${trip.id}`, search })
  }

  return (
    <section aria-labelledby="plan-trip-title" className="pass border-2 border-zobo/30 p-5 sm:p-6">
      <h2 id="plan-trip-title" className="flex items-center gap-2 text-2xl">
        <Icon name="suitcase" className="size-5 text-zobo-ink" /> Plan a trip
      </h2>
      {existing.length > 0 && (
        <ul className="mt-3 space-y-1">
          {existing.map((t) => (
            <li key={t.id}>
              <Link
                to={{ pathname: `/trips/${t.id}`, search }}
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-zobo-soft px-3 text-sm font-bold text-zobo-ink hover:underline"
              >
                <span className="truncate">{t.name}</span>
                <span className="shrink-0 font-mono text-xs font-normal">{formatDateRange(t.startDate, t.endDate)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <div className="mt-4">
          <TripForm defaultName={`${place.name} trip`} submitLabel="Create trip" onSubmit={create} onCancel={() => setOpen(false)} />
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft">Pick your dates, then add what you’ll do each day. Costs add up in {country?.currencies?.[0]?.code ?? 'local money'} and Naira.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover"
          >
            <Icon name="plus" className="size-4" /> {existing.length ? 'Plan another trip' : `Plan a trip to ${place.name}`}
          </button>
        </>
      )}
    </section>
  )
}
