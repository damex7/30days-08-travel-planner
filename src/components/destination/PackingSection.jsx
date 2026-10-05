import { Section } from '../Section.jsx'
import { SkeletonBlock } from '../States.jsx'
import { PackingList } from '../PackingList.jsx'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'
import { buildPackingList, EMPTY_PACKING, summariseForecast } from '../../lib/packing.js'

/*
  A packing list for "if I went this week", built from the forecast. It
  depends on the forecast request, so it shares that request's state:
  while the forecast loads this shows a skeleton, and if the forecast
  failed its Retry re-runs the forecast. Your ticks are saved per city.
  (A trip gets its own list, matched to its dates: see the trip page.)
*/
export function PackingSection({ place, forecast, currencyCode, units, onRetry }) {
  const [saved, setSaved] = useLocalStorage(`passport-packing:${place.id}`, EMPTY_PACKING)

  return (
    <Section
      title="Packing list"
      stamp="This week"
      icon="suitcase"
      state={forecast}
      onRetry={onRetry}
      errorTitle="Can’t build the list without the forecast"
      skeleton={<SkeletonBlock label="packing list" lines={6} />}
      isEmpty={() => false}
    >
      {({ days }) => {
        const summary = summariseForecast(days)
        return (
          <>
            <p className="mb-4 text-sm text-ink-soft">
              Built from the next {days.length} days of weather in {place.name}. Tick things off as you pack; your list is saved on this device.
            </p>
            <PackingList generated={buildPackingList(summary, { units, currencyCode })} saved={saved} onChange={setSaved} />
          </>
        )
      }}
    </Section>
  )
}
