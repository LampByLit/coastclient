const APIFY_ACTOR = 'johnvc~fuelprices'

function token() {
  return import.meta.env.APIFY_TOKEN || ''
}

export async function getFuelPrices(search, fuel = 1) {
  if (!token() || !search || String(search).trim() === '') return []
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token())}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search: String(search).trim(),
      fuel: Number(fuel) || 1,
      lang: 'en',
      maxAge: 0,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = data?.error?.message || res.statusText || 'Fuel prices request failed'
    throw new Error(err)
  }
  return Array.isArray(data) ? data : []
}
