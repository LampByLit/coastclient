import { useState, useEffect } from 'react'
import { TRUCK_SIZES, PER_KM_RATE, LABOR_RATE_PER_HOUR } from '../../data/uhaul'
import { getRouteDistanceKm, reverseGeocodeToPlace } from '../../api/geoapify'
import { getFuelPrices } from '../../api/apifyFuel'
import AddressInput from './AddressInput'
import RouteMap from './RouteMap'
import './QuoteTool.css'

const MIN_MOVERS = 2
const MIN_HOURS_PER_MOVER = 2

function effectiveMoverHours(h) {
  const n = Number(h)
  if (Number.isNaN(n) || n < 0) return MIN_HOURS_PER_MOVER
  return Math.max(MIN_HOURS_PER_MOVER, n)
}

export default function QuoteToolView({ initial, onBackToWizard }) {
  const [destinations, setDestinations] = useState(() =>
    initial.destinations?.length
      ? initial.destinations.map((d) => ({ ...d }))
      : [
          { id: 1, address: '', lat: null, lon: null },
          { id: 2, address: '', lat: null, lon: null },
        ]
  )
  const [needsTruck, setNeedsTruck] = useState(initial.needsTruck !== false)
  const [truckSize, setTruckSize] = useState(
    TRUCK_SIZES.some((t) => t.id === initial.truckSize) ? initial.truckSize : TRUCK_SIZES[0].id
  )
  const [routeDistanceKm, setRouteDistanceKm] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [fuelLoading, setFuelLoading] = useState(false)
  const [fuelError, setFuelError] = useState(null)
  const [fuelStations, setFuelStations] = useState([])
  const [fuelSearchLabel, setFuelSearchLabel] = useState('')
  const [fuelSearchLoading, setFuelSearchLoading] = useState(false)
  const [movers, setMovers] = useState([
    { id: 1, hours: MIN_HOURS_PER_MOVER },
    { id: 2, hours: MIN_HOURS_PER_MOVER },
  ])
  const [dateEnabled, setDateEnabled] = useState(!!(initial.selectedDate && String(initial.selectedDate).trim()))
  const [selectedDate, setSelectedDate] = useState(initial.selectedDate || '')

  const waypoints = destinations
    .filter((d) => d.lat != null && d.lon != null)
    .map((d) => [d.lat, d.lon])

  const waypointsKey = waypoints.length >= 2 ? waypoints.map((w) => `${w[0]},${w[1]}`).join('|') : ''

  useEffect(() => {
    if (!waypointsKey) {
      setRouteDistanceKm(null)
      setRouteCoordinates(null)
      setRouteError(null)
      return
    }
    let cancelled = false
    setRouteLoading(true)
    setRouteError(null)
    getRouteDistanceKm(waypoints)
      .then((result) => {
        if (!cancelled && result != null) {
          setRouteDistanceKm(result.distanceKm)
          setRouteCoordinates(result.coordinates ?? null)
          setRouteError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRouteDistanceKm(null)
          setRouteCoordinates(null)
          setRouteError(err.message || 'Could not get route')
        }
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [waypointsKey])

  const destination = destinations[destinations.length - 1]
  const hasDestinationAddress = !!destination?.address?.trim()

  useEffect(() => {
    if (!needsTruck) return
    const dest = destinations[destinations.length - 1]
    if (!dest) return
    if (dest.lat != null && dest.lon != null) {
      setFuelSearchLoading(true)
      reverseGeocodeToPlace(dest.lat, dest.lon)
        .then((place) => {
          setFuelSearchLabel(place || dest.address || '')
        })
        .catch(() => setFuelSearchLabel(dest.address || ''))
        .finally(() => setFuelSearchLoading(false))
    } else {
      setFuelSearchLabel(dest.address || '')
    }
  }, [needsTruck, destinations])

  useEffect(() => {
    if (!needsTruck || !fuelSearchLabel.trim()) return
    let cancelled = false
    setFuelLoading(true)
    setFuelError(null)
    getFuelPrices(fuelSearchLabel.trim(), 1)
      .then((items) => {
        if (!cancelled) {
          setFuelStations(items)
          setFuelError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFuelStations([])
          setFuelError(err.message || 'Could not get fuel prices')
        }
      })
      .finally(() => {
        if (!cancelled) setFuelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [needsTruck, fuelSearchLabel])

  const truck = TRUCK_SIZES.find((t) => t.id === truckSize) || TRUCK_SIZES[0]
  const distanceKm = routeDistanceKm != null ? routeDistanceKm : 0
  const rental = needsTruck ? truck.baseRental : 0
  const distanceFee = distanceKm * PER_KM_RATE

  const isCanadaFuel =
    fuelSearchLabel.includes('Canada') ||
    fuelSearchLabel.includes(', BC') ||
    /,\s*(BC|AB|ON|QC|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/.test(fuelSearchLabel) ||
    (fuelStations[0]?.address_region &&
      ['BC', 'AB', 'ON', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'].includes(
        String(fuelStations[0].address_region).toUpperCase()
      ))
  const firstPriceRaw =
    fuelStations[0] && (fuelStations[0].price_credit != null ? fuelStations[0].price_credit : fuelStations[0].price_cash)
  const pricePerLitre = (() => {
    if (firstPriceRaw == null || firstPriceRaw === '') return null
    const num = Number(firstPriceRaw)
    if (Number.isNaN(num)) return null
    if (isCanadaFuel) return num > 50 ? num / 100 : num
    if (num > 20) return num / 100
    return num / 3.78541
  })()
  const fuelLperKm = truck.fuelLperKm ?? 0.28
  const fuelCost =
    needsTruck && distanceKm > 0 && pricePerLitre != null && pricePerLitre > 0
      ? distanceKm * fuelLperKm * pricePerLitre
      : 0

  const laborCost = movers.reduce((sum, m) => sum + effectiveMoverHours(m.hours) * LABOR_RATE_PER_HOUR, 0)
  const total = rental + distanceFee + fuelCost + laborCost

  const formatFuelPrice = (p) => {
    if (p == null || p === '') return null
    const num = Number(p)
    if (Number.isNaN(num)) return null
    if (isCanadaFuel) {
      if (num > 50) return { text: `${(num / 100).toFixed(2)} $/L`, raw: num / 100 }
      return { text: `${num.toFixed(2)} $/L`, raw: num }
    }
    if (num > 20) return { text: `${(num / 100).toFixed(2)} $/L`, raw: num / 100 }
    return { text: `${(num / 3.78541).toFixed(2)} $/L`, raw: num / 3.78541 }
  }
  const firstFuelStation = fuelStations[0]
  const firstFuelPriceRaw =
    firstFuelStation && (firstFuelStation.price_credit != null ? firstFuelStation.price_credit : firstFuelStation.price_cash)
  const formattedFuelPrice = formatFuelPrice(firstFuelPriceRaw)

  const formatPrintDate = (iso) => {
    if (!iso || !iso.trim()) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const updateAddress = (id, address, lat, lon) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, address, lat: lat ?? null, lon: lon ?? null } : d))
    )
  }

  const addStop = () => {
    setDestinations((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((d) => d.id)) + 1,
        address: '',
        lat: null,
        lon: null,
      },
    ])
  }

  const removeStop = (id) => {
    if (destinations.length <= 2) return
    setDestinations((prev) => prev.filter((d) => d.id !== id))
  }

  const addMover = () => {
    setMovers((prev) => [
      ...prev,
      { id: Math.max(0, ...prev.map((m) => m.id)) + 1, hours: MIN_HOURS_PER_MOVER },
    ])
  }

  const removeMover = (id) => {
    if (movers.length <= MIN_MOVERS) return
    setMovers((prev) => prev.filter((m) => m.id !== id))
  }

  const updateMoverHours = (id, value) => {
    const n = parseFloat(value)
    setMovers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        if (value === '' || Number.isNaN(n)) return { ...m, hours: m.hours }
        return { ...m, hours: n }
      })
    )
  }

  const clampMoverHours = (id) => {
    setMovers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hours: effectiveMoverHours(m.hours) } : m))
    )
  }

  return (
    <div className="quoteToolSurface">
      <header className="appBar">
        <h1 className="appTitle">Coast Team Moving</h1>
        <div className="appBarActions no-print">
          {typeof onBackToWizard === 'function' && (
            <button type="button" className="btnPrint" onClick={onBackToWizard}>
              Start over
            </button>
          )}
          <button type="button" className="btnPrint" onClick={() => window.print()} aria-label="Print quote">
            Print
          </button>
          <button type="button" className="btnBook" disabled title="Calendar booking coming soon">
            Book
          </button>
        </div>
      </header>

      <main className="main">
        <div className="mainGrid">
          <section className="card mainLeft no-print">
            <h2 className="cardTitle">Stops</h2>

            <div className="optionalSection optionalSectionTop">
              <label className="toggleRow">
                <input
                  type="checkbox"
                  checked={dateEnabled}
                  onChange={(e) => setDateEnabled(e.target.checked)}
                />
                <span className="toggleLabel">Move date</span>
              </label>
              {dateEnabled && (
                <div className="datePanel">
                  <input
                    type="date"
                    className="qtInput inputDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    aria-label="Choose date"
                  />
                </div>
              )}
            </div>

            <p className="cardHint">Add or edit stops for your move.</p>
            <ul className="stopList">
              {destinations.map((d, i) => (
                <li key={d.id} className="stopRow">
                  <span className="stopLabel">
                    {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
                  </span>
                  <AddressInput
                    value={d.address}
                    onChange={(address, lat, lon) => updateAddress(d.id, address, lat, lon)}
                    placeholder="Start typing address..."
                  />
                  <button
                    type="button"
                    className="btnIcon"
                    onClick={() => removeStop(d.id)}
                    disabled={destinations.length <= 2}
                    aria-label="Remove stop"
                  >
                    −
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btnSecondary" onClick={addStop}>
              + Add stop
            </button>
          </section>

          <section className="card quoteCard mainCenter" id="quote-card">
            <h2 className="cardTitle">Quote</h2>
            <div className="quoteMeta">
              {routeLoading && waypoints.length >= 2 && <span className="quoteDistanceMuted">Getting route...</span>}
              {routeError && waypoints.length >= 2 && <span className="quoteDistanceError">{routeError}</span>}
              {!routeLoading && routeDistanceKm != null && (
                <>
                  <span className="quoteDistance">Distance: {Math.round(routeDistanceKm)} km</span>
                  <span className="quoteDistanceSub no-print">
                    {Math.round(routeDistanceKm)} km × ${PER_KM_RATE.toFixed(2)}/km
                  </span>
                </>
              )}
              {!routeLoading && !routeError && waypoints.length < 2 && (
                <span className="quoteDistanceMuted">Select addresses at 2+ stops for route distance</span>
              )}
            </div>

            <div className="printItemization" aria-hidden="true">
              {dateEnabled && selectedDate && (
                <>
                  <h3 className="printItemizationTitle">Date</h3>
                  <p className="printDetail">{formatPrintDate(selectedDate)}</p>
                </>
              )}

              <h3 className="printItemizationTitle">Route</h3>
              <ul className="printStops">
                {destinations.map((d, i) => (
                  <li key={d.id} className="printStopRow">
                    <span className="printStopLabel">
                      {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
                    </span>
                    <span className="printStopAddress">{d.address || '—'}</span>
                  </li>
                ))}
              </ul>

              <h3 className="printItemizationTitle">Truck</h3>
              <p className="printDetail">
                {needsTruck
                  ? `${truck.label}${truck.cubicFeet != null ? ` (${truck.cubicFeet.toLocaleString()} cu ft)` : ''} — $${truck.baseRental.toFixed(2)} base rental`
                  : 'Your own truck (no rental in this quote)'}
              </p>

              <h3 className="printItemizationTitle">Distance</h3>
              <p className="printDetail">
                {routeDistanceKm != null
                  ? `${Math.round(routeDistanceKm)} km × $${PER_KM_RATE.toFixed(2)}/km = $${distanceFee.toFixed(2)}`
                  : '—'}
              </p>

              {needsTruck && (
                <>
                  <h3 className="printItemizationTitle">Fuel</h3>
                  <p className="printDetail">
                    Nearest to: {fuelSearchLabel || '—'}
                    {firstFuelStation && (
                      <>
                        <br />
                        <span className="printFuelStation">
                          {firstFuelStation.name}
                          {firstFuelStation.address_line1 || firstFuelStation.address_locality
                            ? ` — ${[firstFuelStation.address_line1, firstFuelStation.address_locality, firstFuelStation.address_region].filter(Boolean).join(', ')}`
                            : ''}
                        </span>
                        {formattedFuelPrice && (
                          <>
                            <br />
                            {formattedFuelPrice.text} × {distanceKm.toFixed(0)} km × {truck.fuelLperKm ?? 0.28} L/km = $
                            {fuelCost.toFixed(2)}
                          </>
                        )}
                      </>
                    )}
                  </p>
                </>
              )}

              <h3 className="printItemizationTitle">Labor</h3>
              <ul className="printLaborList">
                {movers.map((m, i) => {
                  const hrs = effectiveMoverHours(m.hours)
                  const sub = hrs * LABOR_RATE_PER_HOUR
                  return (
                    <li key={m.id} className="printLaborRow">
                      Mover {i + 1}: {hrs} hrs × ${LABOR_RATE_PER_HOUR}/hr = ${sub.toFixed(2)}
                    </li>
                  )
                })}
              </ul>
              <p className="printDetail">Labor total: ${laborCost.toFixed(2)}</p>

              <h3 className="printItemizationTitle">Summary</h3>
            </div>

            <dl className="quoteBreakdown">
              {needsTruck && (
                <div className="quoteRow">
                  <dt>Rental</dt>
                  <dd>${rental.toFixed(2)}</dd>
                </div>
              )}
              <div className="quoteRow">
                <dt>Distance fee</dt>
                <dd>${distanceFee.toFixed(2)}</dd>
              </div>
              {needsTruck && (
                <div className="quoteRow">
                  <dt>Fuel</dt>
                  <dd>{fuelLoading ? '…' : fuelCost > 0 ? `$${fuelCost.toFixed(2)}` : '—'}</dd>
                </div>
              )}
              <div className="quoteRow">
                <dt>Labor</dt>
                <dd>${laborCost.toFixed(2)}</dd>
              </div>
              <div className="quoteRow quoteTotal">
                <dt>Total</dt>
                <dd>${total.toFixed(2)}</dd>
              </div>
            </dl>
            {waypoints.length >= 2 && (
              <div className="quoteMapWrap no-print">
                <RouteMap waypoints={waypoints} routeCoordinates={routeCoordinates} />
              </div>
            )}
          </section>

          <section className="card mainRight no-print">
            <h2 className="cardTitle">Quote options</h2>

            <div className="optionalSection optionalSectionTop">
              <label className="toggleRow">
                <input
                  type="checkbox"
                  checked={needsTruck}
                  onChange={(e) => setNeedsTruck(e.target.checked)}
                />
                <span className="toggleLabel">Include our truck in this quote</span>
              </label>
              <p className="optionalHint">When included, a fuel estimate is added automatically.</p>
            </div>

            {needsTruck && (
              <>
                <h2 className="cardTitle" style={{ marginTop: '1rem' }}>
                  Truck size
                </h2>
                <div className="truckGrid">
                  {TRUCK_SIZES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`truckCard ${truckSize === t.id ? 'truckCardActive' : ''}`}
                      onClick={() => setTruckSize(t.id)}
                    >
                      <span className="truckLabel">{t.label}</span>
                      {t.cubicFeet != null && <span className="truckCubicFt">{t.cubicFeet.toLocaleString()} cu ft</span>}
                      <span className="truckPrice">${t.baseRental.toFixed(2)}</span>
                    </button>
                  ))}
                </div>

                <div className="optionalSection">
                  <p className="toggleLabel" style={{ marginBottom: '8px' }}>
                    Fuel (included)
                  </p>
                  <div className="fuelPanel">
                    <p className="optionalHint">Regular fuel from a station near your destination, applied to trip distance.</p>
                    {fuelSearchLoading && <p className="optionalHint">Resolving destination…</p>}
                    {!fuelSearchLoading && fuelSearchLabel && (
                      <p className="fuelSearchLabel">
                        Nearest to: <strong>{fuelSearchLabel}</strong>
                      </p>
                    )}
                    {!hasDestinationAddress && !fuelSearchLoading && (
                      <p className="optionalHint">Set destination address to estimate fuel.</p>
                    )}
                    {fuelError && <p className="quoteDistanceError">{fuelError}</p>}
                    {fuelStations.length > 0 &&
                      (() => {
                        const isCanada =
                          fuelSearchLabel.includes('Canada') ||
                          fuelSearchLabel.includes(', BC') ||
                          /,\s*(BC|AB|ON|QC|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/.test(fuelSearchLabel) ||
                          (fuelStations[0]?.address_region &&
                            ['BC', 'AB', 'ON', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'].includes(
                              String(fuelStations[0].address_region).toUpperCase()
                            ))
                        const formatPrice = (p) => {
                          if (p == null || p === '') return null
                          const num = Number(p)
                          if (Number.isNaN(num)) return null
                          if (isCanada) {
                            if (num > 50) return { text: `${(num / 100).toFixed(2)} $/L`, raw: num / 100 }
                            return { text: `${num.toFixed(2)} $/L`, raw: num }
                          }
                          if (num > 20) return { text: `${(num / 100).toFixed(2)} $/L`, raw: num / 100 }
                          return { text: `${(num / 3.78541).toFixed(2)} $/L`, raw: num / 3.78541 }
                        }
                        const s = fuelStations[0]
                        const price = s.price_credit != null ? s.price_credit : s.price_cash
                        const formatted = formatPrice(price)
                        return (
                          <ul className="fuelList">
                            <li className="fuelItem">
                              <span className="fuelStationName">{s.name}</span>
                              <span className="fuelStationPrice">{formatted ? formatted.text : '—'}</span>
                              {(s.address_line1 || s.address_locality) && (
                                <span className="fuelStationAddr">
                                  {[s.address_line1, s.address_locality, s.address_region].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </li>
                          </ul>
                        )
                      })()}
                    {!fuelLoading && !fuelError && fuelStations.length === 0 && fuelSearchLabel.trim() && (
                      <p className="optionalHint">No stations found for this location.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="optionalSection">
              <p className="toggleLabel" style={{ marginBottom: '8px' }}>
                Labor (minimum {MIN_MOVERS} movers × {MIN_HOURS_PER_MOVER} hrs each)
              </p>
              <div className="laborPanel">
                <p className="optionalHint">${LABOR_RATE_PER_HOUR}/hour per mover. You can add movers or increase hours.</p>
                <ul className="moverList">
                  {movers.map((m, i) => (
                    <li key={m.id} className="moverRow">
                      <span className="moverLabel">Mover {i + 1}</span>
                      <input
                        type="number"
                        min={MIN_HOURS_PER_MOVER}
                        step="0.5"
                        className="qtInput moverHours"
                        value={m.hours}
                        onChange={(e) => updateMoverHours(m.id, e.target.value)}
                        onBlur={() => clampMoverHours(m.id)}
                        aria-label={`Mover ${i + 1} hours`}
                      />
                      <span className="moverHoursLabel">hrs</span>
                      <button
                        type="button"
                        className="btnIcon"
                        onClick={() => removeMover(m.id)}
                        disabled={movers.length <= MIN_MOVERS}
                        aria-label="Remove mover"
                      >
                        −
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btnSecondary" onClick={addMover}>
                  + Add mover
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
