import { Section } from '../Section.jsx'
import { EmptyState, Skeleton } from '../States.jsx'
import { WeatherIcon } from '../WeatherIcon.jsx'
import { describeWeather } from '../../lib/api/weather.js'
import { formatDayLong, formatTemp, weekdayShort } from '../../lib/format.js'

/*
  The 7-day forecast as rows: day, icon, chance of rain, and the low-to-high
  range drawn as a bar against the whole week's range, so a cold morning
  or a hot afternoon stands out at a glance.
*/
export function ForecastSection({ state, onRetry, units, placeName }) {
  return (
    <Section
      title="7-day forecast"
      stamp="Weather"
      icon="sun"
      state={state}
      onRetry={onRetry}
      skeleton={<ForecastSkeleton />}
      isEmpty={(data) => !data?.days?.length}
      empty={
        <EmptyState compact icon="sun" title="No forecast available">
          Open-Meteo didn’t return a forecast for {placeName}. Try again later.
        </EmptyState>
      }
      credit={
        <>
          Forecast in local time.{' '}
          <a className="underline underline-offset-2 hover:text-ink" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo.com
          </a>{' '}
          (CC BY 4.0)
        </>
      }
    >
      {({ days }) => <ForecastList days={days} units={units} />}
    </Section>
  )
}

function ForecastList({ days, units }) {
  const weekLow = Math.min(...days.map((d) => d.low))
  const weekHigh = Math.max(...days.map((d) => d.high))
  const span = Math.max(weekHigh - weekLow, 1)

  return (
    <ul className="divide-y divide-line">
      {days.map((day, i) => {
        const { label } = describeWeather(day.code)
        const left = ((day.low - weekLow) / span) * 100
        const width = Math.max(((day.high - day.low) / span) * 100, 4)
        return (
          <li key={day.date} className="grid grid-cols-[3.2rem_2.25rem_3rem_1fr] items-center gap-x-2 py-2.5 sm:grid-cols-[4.5rem_2.5rem_8rem_3.5rem_1fr]">
            <span className="font-bold">
              {i === 0 ? 'Today' : weekdayShort(day.date)}
              <span className="sr-only">, {formatDayLong(day.date)}</span>
            </span>
            <WeatherIcon code={day.code} className="size-8" decorative />
            <span className="hidden truncate text-sm text-ink-soft sm:block">{label}</span>
            <span className="sr-only sm:hidden">{label}. </span>
            <span className="font-mono text-xs text-sage" title="Chance of rain">
              {day.rainChance != null && day.rainChance >= 10 ? (
                <>
                  {day.rainChance}%<span className="sr-only"> chance of rain</span>
                </>
              ) : (
                <span className="sr-only">Little chance of rain</span>
              )}
            </span>
            <span className="flex items-center gap-2 font-mono text-sm">
              <span className="w-8 text-right text-ink-soft">
                <span className="sr-only">Low </span>
                {formatTemp(day.low, units)}
              </span>
              <span aria-hidden="true" className="relative h-1.5 flex-1 rounded-full bg-panel-2">
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#e2a12b] to-[#c0392b]"
                  style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                />
              </span>
              <span className="w-8 font-medium">
                <span className="sr-only">High </span>
                {formatTemp(day.high, units)}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ForecastSkeleton() {
  return (
    <div role="status" aria-label="Loading forecast" className="divide-y divide-line">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  )
}
