import { Link } from 'react-router-dom'
import { CitySearch } from '../components/CitySearch.jsx'
import { Flag } from '../components/Flag.jsx'
import { Icon } from '../components/Icon.jsx'
import { useRecents } from '../hooks/useRecents.js'
import { useUnitsSearch } from '../hooks/useUnits.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { diffFromLagos, shortDiff } from '../lib/time.js'

/*
  Popular first trips from Nigeria. The ids are Open-Meteo/GeoNames ids,
  so these cards link straight to the destination page without a search.
  The airport codes are only for the boarding-pass look.
*/
const SUGGESTED = [
  { id: '2306104', name: 'Accra', country: 'Ghana', countryCode: 'GH', timezone: 'Africa/Accra', iata: 'ACC', note: 'Next door: a short hop across the border' },
  { id: '184745', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', iata: 'NBO', note: 'East Africa’s hub and the safari gateway' },
  { id: '292223', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', iata: 'DXB', note: 'Shopping, stopovers and the desert' },
  { id: '2643743', name: 'London', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', iata: 'LHR', note: 'Family visits, study and business' },
  { id: '3369157', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', iata: 'CPT', note: 'Table Mountain between two oceans' },
  { id: '993800', name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', iata: 'JNB', note: 'South Africa’s business capital' },
]

export default function Home() {
  useDocumentTitle(null)
  const { recents, clearRecents } = useRecents()
  const unitsSearch = useUnitsSearch()

  return (
    <div className="space-y-12">
      <section aria-labelledby="hero-title" className="pt-4 sm:pt-10">
        <p className="stamp text-saffron-ink">Departing Lagos · LOS</p>
        <h1 id="hero-title" className="mt-4 max-w-3xl text-[2.6rem] leading-[1.05] sm:text-6xl">
          Where are you flying <em className="text-zobo-ink">next?</em>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          One page for any city: the week’s weather, prices in Naira, the time difference from Lagos, country facts and a
          packing list built from the forecast. Then plan the trip day by day.
        </p>
        <div className="mt-8 max-w-2xl">
          <CitySearch />
        </div>
      </section>

      {recents.length > 0 && (
        <section aria-labelledby="recent-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-title" className="flex items-center gap-2 text-2xl">
              <Icon name="history" className="size-5 text-ink-faint" /> Recently viewed
            </h2>
            <button
              type="button"
              onClick={clearRecents}
              className="min-h-11 rounded-full px-3 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Clear
            </button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recents.map((place) => (
              <li key={place.id}>
                <Link
                  to={{ pathname: `/place/${place.id}`, search: unitsSearch }}
                  className="press flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel py-1 pr-4 pl-3 text-sm hover:border-zobo"
                >
                  <Flag code={place.countryCode} />
                  <span className="font-bold">{place.name}</span>
                  <span className="hidden text-ink-faint sm:inline">{place.label.split(', ').slice(1).join(', ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="suggested-title">
        <h2 id="suggested-title" className="text-2xl">
          Popular from Lagos
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3">
          {SUGGESTED.map((place) => (
            <li key={place.id}>
              <BoardingPassCard place={place} search={unitsSearch} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function BoardingPassCard({ place, search }) {
  const diff = diffFromLagos(place.timezone)
  return (
    <Link
      to={{ pathname: `/place/${place.id}`, search }}
      className="pass press group block h-full overflow-hidden transition-shadow hover:shadow-pop"
    >
      <div className="p-5">
        <div className="flex items-center gap-2 font-mono text-sm tracking-widest text-ink-faint">
          <span>LOS</span>
          <span aria-hidden="true" className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
          <Icon name="plane" className="size-4 text-zobo-ink transition-transform group-hover:translate-x-1" />
          <span aria-hidden="true" className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
          <span className="font-medium text-ink">{place.iata}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-3xl leading-none">{place.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{place.country}</p>
          </div>
          <Flag code={place.countryCode} className="h-6 w-9" />
        </div>
      </div>
      <div className="perforation" />
      <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
        <span className="text-ink-soft">{place.note}</span>
        <span className="shrink-0 rounded-md bg-saffron-soft px-2 py-0.5 font-mono text-xs text-saffron-ink" title="Time difference from Lagos">
          <span className="sr-only">Time difference from Lagos: </span>
          {shortDiff(diff)}
        </span>
      </div>
    </Link>
  )
}
