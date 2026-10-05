import { DAY, request } from './request.js'

/*
  Wikipedia REST API, page summary: the first paragraph of a city's
  article plus its lead photo. Text is CC BY-SA 4.0, so wherever we show
  it we credit Wikipedia and link back to the article.

  Wikimedia asks every client to identify itself. Browsers won't let a
  page set User-Agent, so their API accepts `Api-User-Agent` instead (it's
  in their CORS allow-list, so it works from the browser).

  Article summaries change rarely: cached for a day.
*/
const BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/'
const HEADERS = { 'Api-User-Agent': 'Passport-travel-planner/0.1 (learning project; https://github.com/damex7)' }

/*
  Finding the right article is a small waterfall of its own: a place name
  is often ambiguous. "Accra" is the capital's article, but "Victoria" is
  a disambiguation page, and a small town may have no article under its
  bare name. So we try, in order, and stop at the first real article:
    1. "Victoria"
    2. "Victoria, British Columbia"   (name + region)
    3. "Victoria, Canada"             (name + country)
  Most cities stop at step 1, so it's usually one request.
  Resolves to null if none of them is an article (an empty state, not an error).
*/
export async function getCitySummary(place, { signal } = {}) {
  const titles = [...new Set([place.name, place.admin1 && `${place.name}, ${place.admin1}`, place.country && `${place.name}, ${place.country}`])].filter(Boolean)

  for (const title of titles) {
    const summary = await getSummary(title, { signal })
    if (summary) return summary
  }
  return null
}

/** One title's summary, or null for a missing article or a disambiguation page. */
export function getSummary(title, { signal } = {}) {
  const path = encodeURIComponent(title.replace(/ /g, '_'))
  return request(BASE + path, {
    signal,
    ttl: DAY,
    key: `wiki:${title}`,
    source: 'Wikipedia',
    headers: HEADERS,
    notFoundIsEmpty: true, // "no article" is an answer worth caching, not an error
    select: normaliseSummary,
  })
}

export function normaliseSummary(raw) {
  if (!raw || raw.type === 'disambiguation' || !raw.extract) return null
  return {
    title: raw.title,
    description: raw.description ?? null, // e.g. "Capital and largest city of Ghana"
    extract: raw.extract,
    url: raw.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(raw.title)}`,
    image: pickImage(raw),
  }
}

/*
  The summary's thumbnail is only 330px wide: blurry as a hero photo.
  Wikimedia serves a fixed set of thumbnail widths (asking for 640px gets
  a 400 error, 960px works), so we swap in the 960px version when the
  original is at least that wide, and otherwise use the original.
*/
function pickImage(raw) {
  const thumb = raw.thumbnail
  const original = raw.originalimage
  if (!thumb?.source) return null
  if (original?.width >= 960 && /\/\d+px-/.test(thumb.source)) {
    return { src: thumb.source.replace(/\/\d+px-/, '/960px-'), width: 960, height: Math.round((960 * original.height) / original.width) }
  }
  if (original?.source && original.width <= 1600) {
    return { src: original.source, width: original.width, height: original.height }
  }
  return { src: thumb.source, width: thumb.width, height: thumb.height }
}
