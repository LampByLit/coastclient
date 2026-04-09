const GEOAPIFY_BASE = 'https://api.geoapify.com/v1'

function apiKey() {
  return import.meta.env.GEOAPIFY_API_KEY || ''
}

export async function getAutocompleteSuggestions(text) {
  if (!apiKey() || !text || text.trim().length < 3) return []
  const url = `${GEOAPIFY_BASE}/geocode/autocomplete?text=${encodeURIComponent(text.trim())}&format=json&limit=5&apiKey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const features = data.features || data.results || []
  return features
    .map((f) => {
      const p = f.properties || f
      const coords = f.geometry?.coordinates
      const lon = coords?.[0] ?? p.lon
      const lat = coords?.[1] ?? p.lat
      return {
        formatted: p.formatted || p.address_line1 || p.name || '',
        lat,
        lon,
      }
    })
    .filter((s) => s.formatted && s.lat != null && s.lon != null)
}

export async function geocodeAddress(address) {
  if (!apiKey() || !address || !address.trim()) return null
  const url = `${GEOAPIFY_BASE}/geocode/search?text=${encodeURIComponent(address.trim())}&format=json&limit=1&apiKey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const f = data.features?.[0]
  if (!f) return null
  const p = f.properties || f
  const coords = f.geometry?.coordinates
  const lon = coords?.[0] ?? p.lon
  const lat = coords?.[1] ?? p.lat
  if (lat == null || lon == null) return null
  return { lat, lon }
}

export async function getRouteDistanceKm(waypoints) {
  if (!apiKey() || !waypoints || waypoints.length < 2) return null
  const waypointsStr = waypoints.map((w) => `${Number(w[0])},${Number(w[1])}`).join('|')
  const url = `${GEOAPIFY_BASE}/routing?waypoints=${encodeURIComponent(waypointsStr)}&mode=drive&units=metric&apiKey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error?.message || 'Routing failed')
  }
  const data = await res.json()
  const feature = data.features?.[0]
  const route = feature?.properties ?? data.results?.[0] ?? data
  if (!route) return null
  let distanceMeters = route.distance
  if (typeof distanceMeters !== 'number' || distanceMeters <= 0) {
    const legs = route.legs || []
    distanceMeters = legs.length ? legs.reduce((sum, leg) => sum + (leg.distance || 0), 0) : 0
  }
  const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : null
  let coordinates = null
  if (feature?.geometry?.coordinates?.length) {
    const lines = feature.geometry.coordinates
    coordinates = lines.flat(1)
    const maxPoints = 1200
    if (coordinates.length > maxPoints) {
      const step = coordinates.length / maxPoints
      coordinates = Array.from({ length: maxPoints }, (_, i) =>
        coordinates[Math.min(Math.floor(i * step), coordinates.length - 1)]
      )
    }
  }
  return { distanceKm, coordinates }
}

export async function reverseGeocodeToPlace(lat, lon) {
  if (!apiKey() || lat == null || lon == null) return null
  const url = `${GEOAPIFY_BASE}/geocode/reverse?lat=${Number(lat)}&lon=${Number(lon)}&format=json&limit=1&apiKey=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const f = data.features?.[0]
  if (!f) return null
  const p = f.properties || f
  const city = p.city || p.town || p.village || p.municipality
  const region = p.state || p.region || p.state_code
  const postcode = p.postcode
  if (city && region) return `${city}, ${region}`
  if (postcode && region) return `${postcode}, ${region}`
  if (city) return city
  if (postcode) return postcode
  return p.formatted || p.address_line1 || null
}
