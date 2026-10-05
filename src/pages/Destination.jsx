import { lazy, Suspense, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDestination } from '../hooks/useDestination.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useRecents } from '../hooks/useRecents.js'
import { useUnits } from '../hooks/useUnits.js'
import { useNow } from '../hooks/useNow.js'
import { EmptyState, ErrorState, Skeleton } from '../components/States.jsx'
import { Flag } from '../components/Flag.jsx'
import { Icon } from '../components/Icon.jsx'
import { WikiSection } from '../components/destination/WikiSection.jsx'
import { ForecastSection } from '../components/destination/ForecastSection.jsx'
import { TypicalYearSection } from '../components/destination/TypicalYearSection.jsx'
import { CountrySection } from '../components/destination/CountrySection.jsx'
import { TimeSection } from '../components/destination/TimeSection.jsx'
import { MoneySection } from '../components/destination/MoneySection.jsx'
import { PackingSection } from '../components/destination/PackingSection.jsx'
import { PlanTripCard } from '../components/destination/PlanTripCard.jsx'
import { diffFromLagos, formatClock, shortDiff } from '../lib/time.js'

// Leaflet is only downloaded when a destination page is opened
const PlaceMap = lazy(() => import('../components/PlaceMap.jsx'))

const SECTION_LABELS = { forecast: 'forecast', typical: 'typical weather', country: 'country facts', rates: 'exchange rates', wiki: 'city summary' }

export default function Destination() {
  const { id } = useParams()
  const [units] = useUnits()
  const { placeState, place, sections, report, retry } = useDestination(id)
  const { addRecent } = useRecents()

  useDocumentTitle(place?.name ?? (placeState.status === 'error' ? 'Place not found' : 'Loading…'))

  useEffect(() => {
    if (place) addRecent(place)
  }, [place, addRecent])

  // ① failed: no coordinates, so no section can load. One page-level state.
  if (placeState.status === 'error') {
    return placeState.error?.kind === 'notfound' ? (
      <EmptyState
        title="We couldn’t find that place"
        icon="pin"
        action={
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover">
            Search for a city
          </Link>
        }
      >
        The link may be old or mistyped.
      </EmptyState>
    ) : (
      <ErrorState title="We couldn’t load this place" error={placeState.error} onRetry={placeState.retry} />
    )
  }

  if (!place) return <DestinationSkeleton />

  return (
    <article className="space-y-6">
      <Hero place={place} wiki={sections.wiki} />

      {/* Screen readers hear one summary when Promise.allSettled reports that every section has finished */}
      <p aria-live="polite" className="sr-only">
        {report &&
          (report.failed.length
            ? `Loaded with problems: the ${report.failed.map((n) => SECTION_LABELS[n]).join(' and ')} couldn't load.`
            : `All sections for ${place.name} loaded.`)}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <WikiSection state={sections.wiki} onRetry={() => retry('wiki')} placeName={place.name} />
          <ForecastSection state={sections.forecast} onRetry={() => retry('forecast')} units={units} placeName={place.name} />
          <PackingSection
            place={place}
            forecast={sections.forecast}
            currencyCode={sections.country.data?.currencies?.[0]?.code}
            units={units}
            onRetry={() => retry('forecast')}
          />
        </div>
        <div className="min-w-0 space-y-6">
          <PlanTripCard place={place} country={sections.country.data} />
          <TimeSection place={place} />
          <MoneySection country={sections.country} rates={sections.rates} retry={retry} />
          <CountrySection state={sections.country} onRetry={() => retry('country')} countryName={place.country} />
          <section aria-labelledby="map-title" className="pass p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 id="map-title" className="flex items-center gap-2 text-2xl">
                <Icon name="map" className="size-5 text-zobo-ink" /> Map
              </h2>
              <a
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=12/${place.lat}/${place.lon}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-bold text-zobo-ink underline-offset-4 hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </div>
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
              <PlaceMap lat={place.lat} lon={place.lon} name={place.name} />
            </Suspense>
          </section>
        </div>
      </div>

      <TypicalYearSection state={sections.typical} onRetry={() => retry('typical')} units={units} />
    </article>
  )
}

/*
  The top of the page is a boarding pass: the Wikipedia photo (or the
  zobo pattern if there's none), the city's name, and a stub with the
  details you'd check first. The name comes from step ①, so it shows
  straight away; only the photo waits for Wikipedia.
*/
function Hero({ place, wiki }) {
  const now = useNow()
  const diff = diffFromLagos(place.timezone, now)
  const image = wiki.status === 'success' ? wiki.data?.image : null

  return (
    <header className="pass overflow-hidden">
      <div className="relative aspect-[4/3] min-h-56 w-full bg-panel-2 sm:aspect-[21/8]">
        {wiki.status === 'loading' ? (
          <div className="absolute inset-0 animate-shimmer bg-panel-2" aria-hidden="true" />
        ) : image ? (
          <img
            src={image.src}
            alt={`${place.name}, photo from its Wikipedia article`}
            width={image.width}
            height={image.height}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="route-band absolute inset-0" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase opacity-90">
            Lagos <Icon name="plane" className="size-4 text-[#f2b84b]" /> {place.name}
          </p>
          <h1 className="mt-2 text-5xl leading-none drop-shadow sm:text-7xl">{place.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm sm:text-base">
            <Flag code={place.countryCode} className="h-4 w-6" />
            {[place.admin1, place.country].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>
      <div className="perforation" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4 sm:px-8">
        <Stub term="Local time" value={formatClock(place.timezone, now)} />
        <Stub term="From Lagos" value={diff === 0 ? 'Same time' : shortDiff(diff)} />
        <Stub term="Timezone" value={place.timezone.split('/').pop().replace(/_/g, ' ')} />
        <Stub term="Coordinates" value={`${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`} />
      </dl>
    </header>
  )
}

function Stub({ term, value }) {
  return (
    <div>
      <dt className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">{term}</dt>
      <dd className="font-mono text-lg font-medium">{value}</dd>
    </div>
  )
}

function DestinationSkeleton() {
  return (
    <div role="status" aria-label="Loading destination" className="space-y-6">
      <div className="pass overflow-hidden">
        <Skeleton className="aspect-[4/3] min-h-56 w-full rounded-none sm:aspect-[21/8]" />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 rounded-[1.25rem]" />
        <Skeleton className="h-64 rounded-[1.25rem]" />
      </div>
    </div>
  )
}
