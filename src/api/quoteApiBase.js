/** Base URL for quote APIs (geocode, routing, fuel). Empty = same-origin `/api` (Vite dev proxy). Production: set VITE_QUOTE_API_BASE to your Railway app origin + `/api`, e.g. https://your-app.up.railway.app/api */
export function getQuoteApiBase() {
  const raw = import.meta.env.VITE_QUOTE_API_BASE
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return '/api'
}
