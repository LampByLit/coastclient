import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function FitBounds({ waypoints, routeCoordinates }) {
  const map = useMap()
  const bounds = useMemo(() => {
    const points = [...(waypoints || []).map((w) => [w[0], w[1]])]
    if (routeCoordinates?.length) {
      routeCoordinates.forEach(([lon, lat]) => points.push([lat, lon]))
    }
    if (points.length < 2) return null
    return L.latLngBounds(points)
  }, [waypoints, routeCoordinates])

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
    }
  }, [map, bounds])

  return null
}

function createMarkerIcon(label, isEnd) {
  const color = isEnd ? '#009B77' : '#666'
  return L.divIcon({
    className: 'quoteMapLeafletIcon',
    html: `<span style="
      display:inline-flex;align-items:center;justify-content:center;
      width:20px;height:20px;border-radius:50%;
      background:${color};color:#fff;border:2px solid #fff;
      font-size:10px;font-weight:600;line-height:1;
    ">${label}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export default function RouteMap({ waypoints = [], routeCoordinates = null }) {
  const routePositions = useMemo(() => {
    if (!routeCoordinates?.length) return []
    return routeCoordinates.map(([lon, lat]) => [lat, lon])
  }, [routeCoordinates])

  if (!waypoints.length) return null

  const center = waypoints.length ? [waypoints[0][0], waypoints[0][1]] : [49.25, -124.8]

  return (
    <div className="quoteMapWrap quoteMapLeaflet">
      <MapContainer
        center={center}
        zoom={8}
        className="quoteMapLeafletContainer"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds waypoints={waypoints} routeCoordinates={routeCoordinates} />
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#009B77',
              weight: 4,
              opacity: 0.95,
            }}
          />
        )}
        {waypoints.map((w, i) => {
          const isFirst = i === 0
          const isLast = i === waypoints.length - 1
          const label = isFirst ? 'A' : isLast ? 'B' : String(i + 1)
          const icon = createMarkerIcon(label, isFirst || isLast)
          return <Marker key={i} position={[w[0], w[1]]} icon={icon} />
        })}
      </MapContainer>
    </div>
  )
}
