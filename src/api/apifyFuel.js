import { getQuoteApiBase } from './quoteApiBase'

export async function getFuelPrices(search, fuel = 1) {
  if (!search || String(search).trim() === '') return []
  const res = await fetch(`${getQuoteApiBase()}/fuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search: String(search).trim(),
      fuel: Number(fuel) || 1,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || 'Fuel prices request failed')
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
