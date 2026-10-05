import { Section } from '../Section.jsx'
import { EmptyState, Skeleton } from '../States.jsx'
import { Icon } from '../Icon.jsx'

/*
  Country facts a traveller from Nigeria actually needs: what they speak,
  how to dial home and be dialled, and which side of the road they drive on.
*/
export function CountrySection({ state, onRetry, countryName }) {
  return (
    <Section
      title="Country facts"
      stamp={countryName || 'Country'}
      icon="globe"
      state={state}
      onRetry={onRetry}
      skeleton={
        <div role="status" aria-label="Loading country facts" className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      }
      empty={
        <EmptyState compact icon="globe" title="No country details">
          Our country dataset doesn’t include {countryName || 'this country'}.
        </EmptyState>
      }
    >
      {(c) => (
        <>
          <div className="flex items-center gap-4">
            <img
              src={c.flag.src}
              srcSet={c.flag.srcSet}
              alt={c.flag.alt}
              width="80"
              height="53"
              className="h-auto w-20 rounded shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
            />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight">{c.name}</p>
              {c.officialName && c.officialName !== c.name && <p className="text-sm text-ink-soft">{c.officialName}</p>}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-x-4 gap-y-3 text-sm min-[420px]:grid-cols-2">
            <Fact icon="building" term="Capital" value={c.capital ?? '–'} />
            <Fact icon="globe" term="Region" value={c.subregion ?? c.region ?? '–'} />
            <Fact icon="chat" term={c.languages.length === 1 ? 'Language' : 'Languages'} value={c.languages.join(', ') || '–'} />
            <Fact
              icon="phone"
              term="Calling code"
              value={
                c.callingCode ? (
                  <>
                    <span className="font-mono">{c.callingCode}</span>
                    <span className="block text-xs text-ink-faint">
                      To call Nigeria from here: <span className="font-mono">+234</span>
                    </span>
                  </>
                ) : (
                  '–'
                )
              }
            />
            <Fact
              icon="car"
              term="Drives on the"
              value={
                <>
                  {c.drivingSide}
                  <span className="block text-xs text-ink-faint">
                    {c.drivingSide === 'left' ? 'Unlike Nigeria: look right first when crossing.' : 'Same side as Nigeria.'}
                  </span>
                </>
              }
            />
            <Fact
              icon="coins"
              term={c.currencies.length === 1 ? 'Currency' : 'Currencies'}
              value={c.currencies.map((cur) => `${cur.name} (${cur.code})`).join(', ') || '–'}
            />
          </dl>
        </>
      )}
    </Section>
  )
}

function Fact({ icon, term, value }) {
  return (
    <div className="flex gap-2.5">
      <Icon name={icon} className="mt-0.5 size-4 shrink-0 text-ink-faint" />
      <div className="min-w-0">
        <dt className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">{term}</dt>
        <dd className="font-semibold capitalize-first">{value}</dd>
      </div>
    </div>
  )
}
