/**
 * Base URL for quote APIs (same paths as interior tool: /api/geocode/*, /api/routing, /api/fuel).
 *
 * - Local dev: leave unset → `/api` (Vite proxies to port 3001).
 * - Production: set VITE_QUOTE_API_BASE to your Railway **service origin** only, e.g.
 *   https://your-app.up.railway.app
 *   We append `/api` if missing so it matches the interior app (which always calls `/api/...` on the same host).
 */
export function getQuoteApiBase() {
  const raw = import.meta.env.VITE_QUOTE_API_BASE
  if (raw == null || String(raw).trim() === '') {
    return '/api'
  }
  let base = String(raw).trim().replace(/\/+$/, '')
  if (!base.endsWith('/api')) {
    base = `${base}/api`
  }
  return base
}
