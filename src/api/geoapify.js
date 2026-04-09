import { getQuoteApiBase } from './quoteApiBase'

const base = () => getQuoteApiBase()

/** Geoapify GeoJSON features use Point coordinates [lon, lat]; lat/lon are not always on properties. */
function latLonFromFeature(f) {
  const p = f?.properties || f
  let lat = p?.lat
  let lon = p?.lon
  const g = f?.geometry
  if (
    (lat == null || lon == null) &&
    g?.type === 'Point' &&
    Array.isArray(g.coordinates) &&
    g.coordinates.length >= 2
  ) {
    lon = Number(g.coordinates[0])
    lat = Number(g.coordinates[1])
  }
  return { lat, lon }
}

export async function getAutocompleteSuggestions(text) {
  if (!text || text.trim().length < 3) return []
  const url = `${base()}/geocode/autocomplete?text=${encodeURIComponent(text.trim())}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const features = data.features || data.results || []
  return features
    .map((f) => {
      const p = f.properties || f
      const { lat, lon } = latLonFromFeature(f)
      return {
        formatted: p.formatted || p.address_line1 || p.name || '',
        lat,
        lon,
      }
    })
    .filter((s) => s.formatted && s.lat != null && s.lon != null && !Number.isNaN(s.lat) && !Number.isNaN(s.lon))
}

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null
  const url = `${base()}/geocode/search?text=${encodeURIComponent(address.trim())}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const f = data.features?.[0]
  if (!f) return null
  const { lat, lon } = latLonFromFeature(f)
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return null
  return { lat, lon }
}

export async function getRouteDistanceKm(waypoints) {
  if (!waypoints || waypoints.length < 2) return null
  const waypointsStr = waypoints.map((w) => `${Number(w[0])},${Number(w[1])}`).join('|')
  const url = `${base()}/routing?waypoints=${encodeURIComponent(waypointsStr)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Routing failed')
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
  if (lat == null || lon == null) return null
  const url = `${base()}/geocode/reverse?lat=${Number(lat)}&lon=${Number(lon)}`
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
