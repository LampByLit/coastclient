import { getQuoteApiBase } from './quoteApiBase'

/** Same path layout as interior tool (`const BASE = '/api'`). */
const base = () => getQuoteApiBase()

function centroidFromRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return null
  let sl = 0
  let sa = 0
  let n = 0
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue
    sl += Number(pt[0])
    sa += Number(pt[1])
    n += 1
  }
  if (n === 0) return null
  return { lon: sl / n, lat: sa / n }
}

/** Geoapify: coords in properties, Point, Polygon centroid, or feature bbox. */
function latLonFromFeature(f) {
  const p = f?.properties ?? f
  let lat =
    p?.lat != null
      ? Number(p.lat)
      : p?.latitude != null
        ? Number(p.latitude)
        : null
  let lon =
    p?.lon != null ? Number(p.lon) : p?.longitude != null ? Number(p.longitude) : null
  const g = f?.geometry
  const gt = g?.type ? String(g.type).toLowerCase() : ''

  if (
    (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) &&
    gt === 'point' &&
    Array.isArray(g.coordinates) &&
    g.coordinates.length >= 2
  ) {
    lon = Number(g.coordinates[0])
    lat = Number(g.coordinates[1])
  }
  if (
    (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) &&
    gt === 'polygon' &&
    Array.isArray(g.coordinates?.[0])
  ) {
    const c = centroidFromRing(g.coordinates[0])
    if (c) {
      lon = c.lon
      lat = c.lat
    }
  }
  if (
    (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) &&
    gt === 'multipolygon' &&
    Array.isArray(g.coordinates?.[0]?.[0])
  ) {
    const c = centroidFromRing(g.coordinates[0][0])
    if (c) {
      lon = c.lon
      lat = c.lat
    }
  }
  if (
    (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) &&
    Array.isArray(f?.bbox) &&
    f.bbox.length >= 4
  ) {
    const [minLon, minLat, maxLon, maxLat] = f.bbox.map(Number)
    if (![minLon, minLat, maxLon, maxLat].some(Number.isNaN)) {
      lon = (minLon + maxLon) / 2
      lat = (minLat + maxLat) / 2
    }
  }
  return { lat, lon }
}

function formattedFromProperties(p) {
  if (!p || typeof p !== 'object') return ''
  if (p.formatted) return String(p.formatted).trim()
  if (p.address_line1) {
    const tail = [p.address_line2, p.city, p.state || p.state_code, p.postcode, p.country].filter(Boolean).join(', ')
    return tail ? `${p.address_line1}, ${tail}` : String(p.address_line1)
  }
  if (p.name) return String(p.name).trim()
  const line = [p.street, p.housenumber].filter(Boolean).join(' ')
  const tail = [p.postcode, p.city, p.state || p.state_code, p.country].filter(Boolean).join(', ')
  if (line && tail) return `${line}, ${tail}`
  if (line) return line
  if (tail) return tail
  return ''
}

function normalizeGeocodeResults(data) {
  if (!data || typeof data !== 'object') return []
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) return data.features
  if (Array.isArray(data.features) && data.features.length) return data.features
  if (Array.isArray(data.results) && data.results.length) {
    return data.results.map((item) => {
      if (item && item.type === 'Feature') return item
      return {
        type: 'Feature',
        properties: item,
        geometry: item?.geometry ?? null,
        bbox: item?.bbox,
      }
    })
  }
  return []
}

async function readFetchError(res) {
  const text = await res.text().catch(() => '')
  try {
    const j = JSON.parse(text)
    return j.error || j.message || text || res.statusText
  } catch {
    return text || res.statusText || `HTTP ${res.status}`
  }
}

export async function getAutocompleteSuggestions(text, options = {}) {
  const { signal } = options
  const q = String(text || '').trim()
  if (q.length < 2) return []
  const url = `${base()}/geocode/autocomplete?text=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(await readFetchError(res))
  }
  const data = await res.json().catch(() => null)
  const features = normalizeGeocodeResults(data)
  return features
    .map((f) => {
      const p = f.properties || f
      const { lat, lon } = latLonFromFeature(f)
      const formatted = formattedFromProperties(p)
      return { formatted, lat, lon }
    })
    .filter((s) => s.formatted && s.lat != null && s.lon != null && !Number.isNaN(s.lat) && !Number.isNaN(s.lon))
}

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null
  const url = `${base()}/geocode/search?text=${encodeURIComponent(address.trim())}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const features = normalizeGeocodeResults(data)
  const f = features[0]
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
