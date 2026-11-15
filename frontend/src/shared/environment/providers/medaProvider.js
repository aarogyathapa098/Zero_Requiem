export const MEDA_FEED_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json'

export async function fetchMedaFeed({ fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), signal } = {}) {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'fetch is not available in this environment.', observations: [] }
  }
  try {
    const response = await fetchImpl(MEDA_FEED_URL, { signal })
    if (!response || !response.ok) {
      return { ok: false, error: `MEDA feed returned HTTP ${response?.status ?? 'unknown'}.`, observations: [] }
    }
    const payload = await response.json()
    return { ok: true, payload }
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error), observations: [] }
  }
}
