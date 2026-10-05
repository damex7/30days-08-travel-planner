import { useId, useState } from 'react'
import { Section } from '../Section.jsx'
import { EmptyState } from '../States.jsx'

const LONG = 420 // characters; longer summaries start clamped so the page isn't all intro on a phone

/*
  The city's Wikipedia summary. The text is CC BY-SA 4.0, which requires
  credit and a link to the source, so the credit line links the article
  and the licence.
*/
export function WikiSection({ state, onRetry, placeName }) {
  return (
    <Section
      title={`About ${placeName}`}
      stamp="Wikipedia"
      icon="book"
      state={state}
      onRetry={onRetry}
      errorTitle="The city summary didn't load"
      empty={
        <EmptyState compact icon="book" title="No Wikipedia summary">
          Wikipedia doesn’t have an English article we could match to {placeName}.
        </EmptyState>
      }
    >
      {(wiki) => <Summary wiki={wiki} />}
    </Section>
  )
}

function Summary({ wiki }) {
  const id = useId()
  const long = wiki.extract.length > LONG
  const [open, setOpen] = useState(false)

  return (
    <>
      {wiki.description && <p className="font-display text-lg text-zobo-ink italic">{wiki.description}</p>}
      <p id={id} className={`mt-2 leading-relaxed text-ink-soft ${long && !open ? 'line-clamp-5' : ''}`}>
        {wiki.extract}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="mt-1 min-h-11 text-sm font-bold text-zobo-ink underline-offset-4 hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        From{' '}
        <a className="underline underline-offset-2 hover:text-ink" href={wiki.url} target="_blank" rel="noreferrer">
          the Wikipedia article “{wiki.title}”
        </a>
        , under{' '}
        <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        .
      </p>
    </>
  )
}
