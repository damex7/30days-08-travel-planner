import { useState } from 'react'
import { Section } from '../Section.jsx'
import { EmptyState, Skeleton } from '../States.jsx'
import { CurrencyConverter } from '../CurrencyConverter.jsx'
import { convert, hasRate, nairaPer } from '../../lib/api/rates.js'
import { formatMoney, formatRate, timeAgo } from '../../lib/format.js'
import { cx } from '../../lib/cx.js'

/*
  Money needs TWO of the parallel answers: the country (which currency?)
  and the rates (how much is it worth?). They load independently, so this
  section combines their states:
    either still loading → skeleton
    country failed       → error, and Retry re-runs the country request
    rates failed         → error, and Retry re-runs the rates request
    both fine            → rates and converter
  The section says which part failed, so Retry fixes the right thing.
*/
export function MoneySection({ country, rates, retry }) {
  const state = combine(country, rates)
  const failedPart = country.status === 'error' ? 'country' : rates.status === 'error' ? 'rates' : null

  return (
    <Section
      title="Money"
      stamp="Naira"
      icon="coins"
      state={state}
      onRetry={() => {
        // Re-run whichever request failed (both, if both did)
        if (country.status === 'error') retry('country')
        if (rates.status === 'error') retry('rates')
      }}
      errorTitle={failedPart === 'country' ? 'We don’t know the currency yet' : 'Exchange rates didn’t load'}
      skeleton={
        <div role="status" aria-label="Loading exchange rates" className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      }
      isEmpty={() => false}
    >
      {({ country: c, rates: r }) => <MoneyBody country={c} rates={r} />}
    </Section>
  )
}

function combine(country, rates) {
  if (country.status === 'error') return { status: 'error', error: country.error }
  if (rates.status === 'error') return { status: 'error', error: rates.error }
  if (country.status === 'loading' || rates.status === 'loading') return { status: 'loading' }
  return { status: 'success', data: { country: country.data, rates: rates.data } }
}

function MoneyBody({ country, rates }) {
  const currencies = (country?.currencies ?? []).filter((c) => c.code === 'NGN' || hasRate(rates, c.code))
  const [code, setCode] = useState(currencies[0]?.code)
  const currency = currencies.find((c) => c.code === code) ?? currencies[0]

  if (!country) {
    return (
      <EmptyState compact icon="coins" title="Currency unknown">
        We don’t have country details for this place, so we can’t tell which currency it uses.
      </EmptyState>
    )
  }
  if (!currency) {
    const listed = country.currencies.map((c) => c.code).join(', ')
    return (
      <EmptyState compact icon="coins" title="No rate available">
        {listed ? `The rates service doesn’t list ${listed}.` : `${country.name} has no currency listed.`}
      </EmptyState>
    )
  }
  if (currency.code === 'NGN') {
    return (
      <EmptyState compact icon="coins" title="Same currency as home">
        {country.name} uses the Naira, so there’s nothing to convert.
      </EmptyState>
    )
  }

  const perUnit = nairaPer(currency.code, rates)
  return (
    <>
      {currencies.length > 1 && (
        <div role="group" aria-label="Currency" className="mb-3 flex flex-wrap gap-2">
          {currencies.map((c) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={c.code === currency.code}
              onClick={() => setCode(c.code)}
              className={cx(
                'min-h-11 rounded-full border px-3 font-mono text-sm',
                c.code === currency.code ? 'border-zobo bg-zobo-soft text-zobo-ink' : 'border-line hover:border-zobo',
              )}
            >
              {c.code}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm text-ink-soft">
        {currency.name} ({currency.code})
      </p>
      <dl className="mt-2 space-y-1.5">
        <RateLine term={`1 ${currency.code}`} value={`₦${formatRate(perUnit)}`} />
        <RateLine term="₦1,000" value={formatMoney(convert(1000, 'NGN', currency.code, rates), currency.code)} />
      </dl>
      <div className="mt-4">
        <CurrencyConverter key={currency.code} currency={currency} rates={rates} />
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Mid-market rate, updated {timeAgo(rates.updatedAt)}. Banks, cards and bureaux de change will give you less. ·{' '}
        <a className="underline underline-offset-2 hover:text-ink" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
          Rates By Exchange Rate API
        </a>
      </p>
    </>
  )
}

function RateLine({ term, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-1.5">
      <dt className="font-mono text-ink-soft">{term}</dt>
      <dd className="font-mono text-xl font-medium">{value}</dd>
    </div>
  )
}
