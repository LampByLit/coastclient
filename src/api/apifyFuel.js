import { getQuoteApiBase } from './quoteApiBase'

export async function getFuelPrices(search, fuel = 1) {
  if (!search || String(search).trim() === '') return []
  const q = new URLSearchParams({
    search: String(search).trim(),
    fuel: String(Number(fuel) || 1),
  })
  const res = await fetch(`${getQuoteApiBase()}/fuel?${q}`, { method: 'GET' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || 'Fuel prices request failed')
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
