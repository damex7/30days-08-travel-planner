import { session } from '../storage.js'

/*
  The one place the app calls fetch. Every API module (geocoding, weather,
  countries, rates, wiki) goes through request(), so errors, timeouts and
  caching behave the same everywhere.

  It:
  1. answers from the sessionStorage cache when there's a fresh copy,
  2. shares one request between callers asking for the same thing at the
     same time (in-flight dedupe),
  3. gives up after TIMEOUT_MS so a stalled API can't spin forever,
  4. retries ONCE after a short pause when the failure looks temporary
     (dropped connection, timeout, 5xx, 429). A 404 or bad JSON isn't
     retried: asking again would get the same answer,
  5. turns every failure into an ApiError with a `kind` and a message a
     person can read, naming which service failed.
*/

const TIMEOUT_MS = 10_000
// Bump when a normaliser changes shape, so old cached copies are ignored.
const CACHE_VERSION = 'pp:v2:'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export class ApiError extends Error {
  /** kind: 'offline' | 'timeout' | 'ratelimit' | 'http' | 'notfound' | 'parse' */
  constructor(message, { kind = 'http', status, source, retryable = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.source = source
    this.retryable = retryable
  }
}

const inFlight = new Map()

/**
 * @param {string} url
 * @param {object} options
 * @param {AbortSignal} [options.signal]  stop waiting (the shared request carries on and is cached)
 * @param {number} [options.ttl]          how long a cached copy stays fresh, in ms (0 = don't cache)
 * @param {string} [options.key]          cache key, if the URL isn't a good one
 * @param {(json) => any} [options.select] normalise BEFORE caching: we store what we use, not the raw payload
 * @param {string} [options.source]       a human name for error messages ("Open-Meteo")
 * @param {object} [options.headers]
 * @param {boolean} [options.notFoundIsEmpty] a 404 means "nothing here": resolve with select(null) and cache it
 */
export function request(url, { signal, ttl = 0, key, select = (json) => json, source = 'The server', headers, notFoundIsEmpty = false } = {}) {
  const cacheKey = CACHE_VERSION + (key ?? url)

  if (ttl > 0) {
    const hit = session.get(cacheKey, null)
    if (hit && Date.now() - hit.savedAt < hit.ttl) return Promise.resolve(hit.data)
  }

  /*
    Dedupe: if the same request is already on its way, wait for that one.
    The shared fetch is NOT tied to any one caller's AbortSignal: if one
    component unmounts, the others still get their answer, and the result
    still lands in the cache for next time. A caller's signal only stops
    that caller from waiting.
  */
  let shared = inFlight.get(cacheKey)
  if (!shared) {
    shared = fetchWithRetry(url, { select, source, headers, notFoundIsEmpty })
      .then((data) => {
        if (ttl > 0) session.set(cacheKey, { savedAt: Date.now(), ttl, data }) // fails quietly if storage is full
        return data
      })
      .finally(() => inFlight.delete(cacheKey))
    inFlight.set(cacheKey, shared)
  }
  return untilAborted(shared, signal)
}

async function fetchWithRetry(url, opts) {
  try {
    return await fetchOnce(url, opts)
  } catch (err) {
    if (!err.retryable) throw err
    await new Promise((r) => setTimeout(r, 700))
    return fetchOnce(url, opts)
  }
}

async function fetchOnce(url, { select, source, headers, notFoundIsEmpty }) {
  let res
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new ApiError(`${source} took too long to answer.`, { kind: 'timeout', source, retryable: true })
    }
    // fetch only rejects (rather than returning a bad status) when the request never got an answer
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new ApiError(offline ? "You're offline. Reconnect and try again." : `Couldn't reach ${source}. Check your connection.`, {
      kind: 'offline',
      source,
      retryable: true,
    })
  }

  if (res.status === 404 && notFoundIsEmpty) return select(null)
  if (res.status === 429) {
    throw new ApiError(`${source} is busy right now. Wait a moment and retry.`, { kind: 'ratelimit', status: 429, source, retryable: true })
  }
  if (res.status === 404) {
    throw new ApiError(`${source} couldn't find that.`, { kind: 'notfound', status: 404, source })
  }
  if (!res.ok) {
    throw new ApiError(`${source} returned an error (${res.status}).`, { kind: 'http', status: res.status, source, retryable: res.status >= 500 })
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new ApiError(`${source} sent back something unexpected.`, { kind: 'parse', status: res.status, source })
  }
  return select(json)
}

/** Resolve with `promise`, unless `signal` aborts first. */
function untilAborted(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

export const q = encodeURIComponent
