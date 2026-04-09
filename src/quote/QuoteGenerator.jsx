import { useState, useEffect, useCallback } from 'react'
import {
  TRUCK_SIZES,
  PER_KM_RATE,
  LABOR_RATE_PER_HOUR,
  MIN_MOVERS,
  MIN_HOURS_PER_MOVER,
} from './data/pricing'
import { getRouteDistanceKm, reverseGeocodeToPlace } from './api/geoapifyClient'
import { getFuelPrices } from './api/apifyFuelClient'
import AddressInput from './components/AddressInput'
import RouteMap from './components/RouteMap'
import { buildBookMovePlainText } from './buildBookMovePlainText'
import './QuoteGenerator.css'

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim())
}

const WIZARD_STEPS = { date: 1, truck: 2, truckSize: 3, addresses: 4 }
const TOTAL_STEPS = 4

function nextId(list) {
  return Math.max(0, ...list.map((x) => x.id)) + 1
}

function emptyStops() {
  return [
    { id: 1, address: '', lat: null, lon: null },
    { id: 2, address: '', lat: null, lon: null },
  ]
}

function formatPrintDate(iso) {
  if (!iso || !iso.trim()) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function QuoteGenerator() {
  const [phase, setPhase] = useState('wizard')
  const [wizardStep, setWizardStep] = useState('date')
  const [moveDate, setMoveDate] = useState('')
  const [dateEnabled, setDateEnabled] = useState(false)
  const [requiresTruck, setRequiresTruck] = useState(true)
  const [truckSize, setTruckSize] = useState(TRUCK_SIZES[0].id)
  const [destinations, setDestinations] = useState(() => emptyStops())
  const [movers, setMovers] = useState([
    { id: 1, hours: MIN_HOURS_PER_MOVER },
    { id: 2, hours: MIN_HOURS_PER_MOVER },
  ])

  const [routeDistanceKm, setRouteDistanceKm] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [fuelLoading, setFuelLoading] = useState(false)
  const [fuelError, setFuelError] = useState(null)
  const [fuelStations, setFuelStations] = useState([])
  const [fuelSearchLabel, setFuelSearchLabel] = useState('')
  const [fuelSearchLoading, setFuelSearchLoading] = useState(false)

  const hasGeoKey = Boolean(import.meta.env.GEOAPIFY_API_KEY)
  const hasApifyToken = Boolean(import.meta.env.APIFY_TOKEN)
  const formspreeFormId = import.meta.env.VITE_FORMSPREE_FORM_ID

  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [bookName, setBookName] = useState('')
  const [bookEmail, setBookEmail] = useState('')
  const [bookPhone, setBookPhone] = useState('')
  const [bookHoneypot, setBookHoneypot] = useState('')
  const [bookSending, setBookSending] = useState(false)
  const [bookSuccess, setBookSuccess] = useState(false)
  const [bookError, setBookError] = useState('')

  const openBookModal = () => {
    setBookError('')
    setBookSuccess(false)
    setBookModalOpen(true)
  }

  const closeBookModal = useCallback(() => {
    setBookModalOpen(false)
    setBookSending(false)
    setBookSuccess((wasSuccess) => {
      if (wasSuccess) {
        setBookName('')
        setBookEmail('')
        setBookPhone('')
        setBookHoneypot('')
      }
      return false
    })
    setBookError('')
  }, [])

  useEffect(() => {
    if (!bookModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeBookModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bookModalOpen, closeBookModal])

  const submitBookMove = async () => {
    if (!formspreeFormId?.trim()) {
      setBookError('Booking form is not configured. Add VITE_FORMSPREE_FORM_ID to your environment.')
      return
    }
    const name = bookName.trim()
    const email = bookEmail.trim()
    if (!name) {
      setBookError('Please enter your name.')
      return
    }
    if (!email || !isValidEmail(email)) {
      setBookError('Please enter a valid email address.')
      return
    }
    if (bookHoneypot.trim()) {
      return
    }

    const message = buildBookMovePlainText(
      { name, email, phone: bookPhone },
      {
        dateLine: dateEnabled && moveDate ? formatPrintDate(moveDate) : '',
        destinations,
        requiresTruck,
        truck,
        routeDistanceKm,
        distanceFee,
        rental,
        fuelSearchLabel,
        firstFuelStation: fuelStations[0] ?? null,
        formattedFuelPriceText: formattedFuelPrice?.text ?? '',
        distanceKm,
        fuelLperKm: truck.fuelLperKm ?? 0.28,
        fuelCost,
        movers,
        laborCost,
        total,
        hasApifyToken,
        MIN_HOURS_PER_MOVER,
        LABOR_RATE_PER_HOUR,
        PER_KM_RATE,
      }
    )

    setBookSending(true)
    setBookError('')
    try {
      const res = await fetch(`https://formspree.io/f/${formspreeFormId.trim()}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _replyto: email,
          _subject: 'New Move Booking Inquiry',
          quote: message,
          _gotcha: bookHoneypot,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setBookSuccess(true)
      } else {
        const errMsg =
          (typeof data.error === 'string' && data.error) ||
          (Array.isArray(data.errors) && data.errors[0] && String(data.errors[0].message || '')) ||
          'Could not send. Please try again or call us.'
        setBookError(errMsg)
      }
    } catch {
      setBookError('Network error. Please try again.')
    } finally {
      setBookSending(false)
    }
  }

  const waypoints = destinations
    .filter((d) => d.lat != null && d.lon != null)
    .map((d) => [d.lat, d.lon])
  const waypointsKey = waypoints.length >= 2 ? waypoints.map((w) => `${w[0]},${w[1]}`).join('|') : ''

  useEffect(() => {
    if (!waypointsKey || !hasGeoKey) {
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
  }, [waypointsKey, hasGeoKey])

  const destination = destinations[destinations.length - 1]
  const hasDestinationAddress = Boolean(destination?.address?.trim())
  const fuelActive = requiresTruck && hasApifyToken

  useEffect(() => {
    if (!fuelActive) return
    const dest = destinations[destinations.length - 1]
    if (!dest) return
    if (dest.lat != null && dest.lon != null) {
      setFuelSearchLoading(true)
      if (!hasGeoKey) {
        setFuelSearchLabel(dest.address || '')
        setFuelSearchLoading(false)
        return
      }
      reverseGeocodeToPlace(dest.lat, dest.lon)
        .then((place) => {
          setFuelSearchLabel(place || dest.address || '')
        })
        .catch(() => setFuelSearchLabel(dest.address || ''))
        .finally(() => setFuelSearchLoading(false))
    } else {
      setFuelSearchLabel(dest.address || '')
    }
  }, [fuelActive, destinations, hasGeoKey])

  useEffect(() => {
    if (!fuelActive || !fuelSearchLabel.trim()) return
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
  }, [fuelActive, fuelSearchLabel])

  const truck = TRUCK_SIZES.find((t) => t.id === truckSize) || TRUCK_SIZES[0]
  const distanceKm = routeDistanceKm != null ? routeDistanceKm : 0
  const rental = requiresTruck ? truck.baseRental : 0
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
    fuelStations[0] &&
    (fuelStations[0].price_credit != null ? fuelStations[0].price_credit : fuelStations[0].price_cash)
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
    fuelActive && distanceKm > 0 && pricePerLitre != null && pricePerLitre > 0
      ? distanceKm * fuelLperKm * pricePerLitre
      : 0
  const laborCost = movers.reduce(
    (sum, m) => sum + (Number(m.hours) || MIN_HOURS_PER_MOVER) * LABOR_RATE_PER_HOUR,
    0
  )
  const total = rental + distanceFee + (requiresTruck ? fuelCost : 0) + laborCost

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
    firstFuelStation &&
    (firstFuelStation.price_credit != null ? firstFuelStation.price_credit : firstFuelStation.price_cash)
  const formattedFuelPrice = formatFuelPrice(firstFuelPriceRaw)

  const wizardStepNumber = WIZARD_STEPS[wizardStep] || 1

  const goWizardTruck = () => setWizardStep('truck')
  const goWizardTruckSize = () => setWizardStep('truckSize')
  const goWizardAddresses = () => setWizardStep('addresses')

  const wizardNextFromDate = () => {
    if (moveDate) setDateEnabled(true)
    goWizardTruck()
  }
  const wizardSkipDate = () => {
    setMoveDate('')
    setDateEnabled(false)
    goWizardTruck()
  }

  const wizardChooseTruckYes = () => {
    setRequiresTruck(true)
    goWizardTruckSize()
  }
  const wizardChooseTruckNo = () => {
    setRequiresTruck(false)
    goWizardAddresses()
  }
  const wizardSkipTruckQuestion = () => {
    setRequiresTruck(true)
    goWizardTruckSize()
  }

  const wizardChooseTruckSize = (id) => {
    setTruckSize(id)
    goWizardAddresses()
  }
  const wizardSkipTruckSize = () => {
    setTruckSize('10')
    goWizardAddresses()
  }

  const finishWizard = () => setPhase('tool')

  const wizardBack = () => {
    if (wizardStep === 'truck') setWizardStep('date')
    else if (wizardStep === 'truckSize') setWizardStep('truck')
    else if (wizardStep === 'addresses') {
      if (requiresTruck) setWizardStep('truckSize')
      else setWizardStep('truck')
    }
  }

  const restartWizard = () => {
    setPhase('wizard')
    setWizardStep('date')
    setMoveDate('')
    setDateEnabled(false)
    setRequiresTruck(true)
    setTruckSize(TRUCK_SIZES[0].id)
    setDestinations(emptyStops())
    setMovers([
      { id: 1, hours: MIN_HOURS_PER_MOVER },
      { id: 2, hours: MIN_HOURS_PER_MOVER },
    ])
  }

  const updateAddress = (id, address, lat, lon) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, address, lat: lat ?? null, lon: lon ?? null } : d))
    )
  }

  const addStop = () => {
    setDestinations((prev) => [
      ...prev,
      { id: nextId(prev), address: '', lat: null, lon: null },
    ])
  }

  const removeStop = (id) => {
    if (destinations.length <= 2) return
    setDestinations((prev) => prev.filter((d) => d.id !== id))
  }

  const addMover = () => {
    setMovers((prev) => [...prev, { id: nextId(prev), hours: MIN_HOURS_PER_MOVER }])
  }

  const removeMover = (id) => {
    if (movers.length <= MIN_MOVERS) return
    setMovers((prev) => prev.filter((m) => m.id !== id))
  }

  const updateMoverHours = (id, hours) => {
    const n = Number(hours)
    const h = Number.isNaN(n) ? MIN_HOURS_PER_MOVER : Math.max(MIN_HOURS_PER_MOVER, n)
    setMovers((prev) => prev.map((m) => (m.id === id ? { ...m, hours: h } : m)))
  }

  const toolHeader = (
    <header className="quoteAppBar no-print">
      <h2 className="quoteAppTitle">Your moving quote</h2>
      <div className="quoteAppBarActions no-print">
        <button type="button" className="quoteBtnBar" onClick={() => window.print()} aria-label="Print quote">
          Print
        </button>
        <button
          type="button"
          className="quoteBtnBar"
          onClick={openBookModal}
          disabled={!formspreeFormId?.trim()}
          title={
            formspreeFormId?.trim()
              ? 'Send this quote to our team'
              : 'Add VITE_FORMSPREE_FORM_ID to .env to enable booking'
          }
          aria-label="Book your move"
        >
          Book Your Move
        </button>
        <button type="button" className="quoteBtnBar" onClick={restartWizard}>
          Start over
        </button>
      </div>
    </header>
  )

  const stopsPanel = (
    <section className="quoteCard quoteMainLeft no-print">
      <h3 className="quoteCardTitle">Stops</h3>
      <div className="quoteOptionalSection quoteOptionalSectionTop">
        <label className="quoteToggleRow">
          <input
            type="checkbox"
            checked={dateEnabled}
            onChange={(e) => setDateEnabled(e.target.checked)}
          />
          <span>Move date</span>
        </label>
        {dateEnabled && (
          <div className="datePanel">
            <input
              type="date"
              className="quoteInput quoteWizardDate"
              style={{ maxWidth: '100%' }}
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              aria-label="Choose move date"
            />
          </div>
        )}
      </div>
      <p className="quoteCardHint">Add every stop for your move.</p>
      <ul className="quoteStopList">
        {destinations.map((d, i) => (
          <li key={d.id} className="quoteStopRow">
            <span className="quoteStopLabel">
              {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
            </span>
            <AddressInput
              value={d.address}
              onChange={(address, lat, lon) => updateAddress(d.id, address, lat, lon)}
              placeholder="Start typing address…"
            />
            <button
              type="button"
              className="quoteBtnIcon"
              onClick={() => removeStop(d.id)}
              disabled={destinations.length <= 2}
              aria-label="Remove stop"
            >
              −
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="quoteBtnSecondary" onClick={addStop}>
        + Add stop
      </button>
    </section>
  )

  const quotePanel = (
    <section className="quoteCard quoteQuoteCard quoteMainCenter" id="quote-card">
      <h3 className="quoteCardTitle no-print">Quote</h3>
      <div className="quoteMeta no-print">
        {!hasGeoKey && (
          <span className="quoteDistanceError">Add GEOAPIFY_API_KEY to show distance and maps.</span>
        )}
        {hasGeoKey && routeLoading && waypoints.length >= 2 && (
          <span className="quoteDistanceMuted">Getting route…</span>
        )}
        {hasGeoKey && routeError && waypoints.length >= 2 && (
          <span className="quoteDistanceError">{routeError}</span>
        )}
        {hasGeoKey && !routeLoading && routeDistanceKm != null && (
          <>
            <span className="quoteDistance">Distance: {Math.round(routeDistanceKm)} km</span>
            <span className="quoteDistanceSub no-print">
              {Math.round(routeDistanceKm)} km × ${PER_KM_RATE.toFixed(2)}/km
            </span>
          </>
        )}
        {hasGeoKey && !routeLoading && !routeError && waypoints.length < 2 && (
          <span className="quoteDistanceMuted">Select addresses at 2+ stops for route distance</span>
        )}
      </div>

      <div className="printItemization" aria-hidden="true">
        <p className="printBrand">Coast Team Moving</p>
        <h1 className="printDocTitle">Moving quote</h1>
        {dateEnabled && moveDate && (
          <>
            <h2 className="printItemizationTitle">Date</h2>
            <p className="printDetail">{formatPrintDate(moveDate)}</p>
          </>
        )}
        <h2 className="printItemizationTitle">Route</h2>
        <ul className="printStops">
          {destinations.map((d, i) => (
            <li key={d.id} className="printStopRow">
              <span className="printStopLabel">
                {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
              </span>
              <span>{d.address || '—'}</span>
            </li>
          ))}
        </ul>
        <h2 className="printItemizationTitle">Truck</h2>
        <p className="printDetail">
          {requiresTruck
            ? `${truck.label} (${truck.cubicFeet?.toLocaleString()} cu ft) — $${truck.baseRental.toFixed(2)} base rental`
            : 'Customer-provided truck (no rental)'}
        </p>
        <h2 className="printItemizationTitle">Distance</h2>
        <p className="printDetail">
          {routeDistanceKm != null
            ? `${Math.round(routeDistanceKm)} km × $${PER_KM_RATE.toFixed(2)}/km = $${distanceFee.toFixed(2)}`
            : '—'}
        </p>
        {requiresTruck && (
          <>
            <h2 className="printItemizationTitle">Fuel</h2>
            <p className="printDetail">
              Nearest to: {fuelSearchLabel || '—'}
              {firstFuelStation && (
                <>
                  <br />
                  <span>
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
        <h2 className="printItemizationTitle">Labor</h2>
        <ul className="printLaborList">
          {movers.map((m, i) => {
            const hrs = Number(m.hours) || MIN_HOURS_PER_MOVER
            const sub = hrs * LABOR_RATE_PER_HOUR
            return (
              <li key={m.id} className="printLaborRow">
                Mover {i + 1}: {hrs} hrs × ${LABOR_RATE_PER_HOUR}/hr = ${sub.toFixed(2)}
              </li>
            )
          })}
        </ul>
        <p className="printDetail">Labor total: ${laborCost.toFixed(2)}</p>
        <h2 className="printItemizationTitle">Totals</h2>
        <table className="printTotalsTable">
          <tbody>
            {requiresTruck && (
              <tr>
                <td>Rental</td>
                <td>${rental.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td>Distance fee</td>
              <td>${distanceFee.toFixed(2)}</td>
            </tr>
            {requiresTruck && (
              <tr>
                <td>Fuel</td>
                <td>{!hasApifyToken || fuelCost <= 0 ? '—' : `$${fuelCost.toFixed(2)}`}</td>
              </tr>
            )}
            <tr>
              <td>Labor</td>
              <td>${laborCost.toFixed(2)}</td>
            </tr>
            <tr className="printTotalsGrand">
              <td>Total</td>
              <td>${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl className="quoteBreakdown no-print">
        {requiresTruck && (
          <div className="quoteRow">
            <dt>Rental</dt>
            <dd>${rental.toFixed(2)}</dd>
          </div>
        )}
        <div className="quoteRow">
          <dt>Distance fee</dt>
          <dd>${distanceFee.toFixed(2)}</dd>
        </div>
        {requiresTruck && (
          <div className="quoteRow">
            <dt>Fuel</dt>
            <dd>
              {!hasApifyToken
                ? '—'
                : fuelLoading
                  ? '…'
                  : fuelCost > 0
                    ? `$${fuelCost.toFixed(2)}`
                    : '—'}
            </dd>
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
      {hasGeoKey && waypoints.length >= 2 && (
        <div className="quoteMapWrap no-print">
          <RouteMap waypoints={waypoints} routeCoordinates={routeCoordinates} />
        </div>
      )}
    </section>
  )

  const optionsPanel = (
    <section className="quoteCard quoteMainRight no-print">
      <h3 className="quoteCardTitle">Truck</h3>
      <label className="quoteToggleRow" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={requiresTruck}
          onChange={(e) => setRequiresTruck(e.target.checked)}
        />
        <span>Truck rental required</span>
      </label>
      {requiresTruck && (
        <>
          <div className="quoteTruckGrid">
            {TRUCK_SIZES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`quoteTruckCard ${truckSize === t.id ? 'quoteTruckCardActive' : ''}`}
                onClick={() => setTruckSize(t.id)}
              >
                <span className="quoteTruckLabel">{t.label}</span>
                {t.cubicFeet != null && (
                  <span className="quoteTruckCubicFt">{t.cubicFeet.toLocaleString()} cu ft</span>
                )}
                <span className="quoteTruckPrice">${t.baseRental.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <div className="quoteOptionalSection">
            <p className="quoteOptionalHint" style={{ marginTop: 0 }}>
              Fuel estimate is included for truck moves (nearest regular price to your destination).
            </p>
            {!hasApifyToken && (
              <p className="quoteDistanceError">Add APIFY_TOKEN for fuel estimates.</p>
            )}
            {fuelSearchLoading && <p className="quoteOptionalHint">Resolving destination…</p>}
            {!fuelSearchLoading && fuelSearchLabel && (
              <p className="quoteFuelSearchLabel">
                Nearest to: <strong>{fuelSearchLabel}</strong>
              </p>
            )}
            {!hasDestinationAddress && !fuelSearchLoading && (
              <p className="quoteOptionalHint">Set destination address to estimate fuel.</p>
            )}
            {fuelError && <p className="quoteDistanceError">{fuelError}</p>}
            {fuelStations.length > 0 &&
              (() => {
                const s = fuelStations[0]
                const price = s.price_credit != null ? s.price_credit : s.price_cash
                const formatted = formatFuelPrice(price)
                return (
                  <ul className="quoteFuelList">
                    <li className="quoteFuelItem">
                      <span className="quoteFuelStationName">{s.name}</span>
                      <span className="quoteFuelStationPrice">{formatted ? formatted.text : '—'}</span>
                      {(s.address_line1 || s.address_locality) && (
                        <span className="quoteFuelStationAddr">
                          {[s.address_line1, s.address_locality, s.address_region].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </li>
                  </ul>
                )
              })()}
            {!fuelLoading && !fuelError && fuelStations.length === 0 && fuelSearchLabel.trim() && hasApifyToken && (
              <p className="quoteOptionalHint">No stations found for this location.</p>
            )}
          </div>
        </>
      )}

      <div className="quoteOptionalSection">
        <p className="quoteCardTitle" style={{ marginBottom: 8 }}>
          Labor
        </p>
        <p className="quoteOptionalHint">
          At least {MIN_MOVERS} movers × {MIN_HOURS_PER_MOVER} hours each (${LABOR_RATE_PER_HOUR}/hr). You can add
          movers or increase hours.
        </p>
        <ul className="quoteMoverList">
          {movers.map((m, i) => (
            <li key={m.id} className="quoteMoverRow">
              <span className="quoteMoverLabel">Mover {i + 1}</span>
              <input
                type="number"
                min={MIN_HOURS_PER_MOVER}
                step={0.5}
                className="quoteInput quoteMoverHours"
                value={m.hours}
                onChange={(e) => updateMoverHours(m.id, e.target.value)}
                onBlur={(e) => updateMoverHours(m.id, e.target.value)}
                aria-label={`Mover ${i + 1} hours`}
              />
              <span className="quoteMoverHoursLabel">hrs</span>
              <button
                type="button"
                className="quoteBtnIcon"
                onClick={() => removeMover(m.id)}
                disabled={movers.length <= MIN_MOVERS}
                aria-label="Remove mover"
              >
                −
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="quoteBtnSecondary" onClick={addMover}>
          + Add mover
        </button>
      </div>
    </section>
  )

  return (
    <div className="quoteGen">
      {phase === 'wizard' && (
        <div className="quoteWizard">
          <p className="quoteWizardStep">
            Step {wizardStepNumber} of {TOTAL_STEPS}
          </p>

          {!hasGeoKey && (
            <p className="quoteKeyMissing">
              Set <code>GEOAPIFY_API_KEY</code> in <code>.env</code> for addresses, routing, and map.
            </p>
          )}

          {wizardStep === 'date' && (
            <>
              <h3 className="quoteWizardTitle">Move date</h3>
              <p className="quoteWizardQuestion">What date do you need your move?</p>
              <input
                type="date"
                className="quoteWizardDate"
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
                aria-label="Move date"
              />
              <div className="quoteWizardActions">
                <button type="button" className="quoteWizardBtnPrimary" onClick={wizardNextFromDate}>
                  Next
                </button>
                <button type="button" className="quoteWizardLink" onClick={wizardSkipDate}>
                  Skip for now
                </button>
              </div>
            </>
          )}

          {wizardStep === 'truck' && (
            <>
              <h3 className="quoteWizardTitle">Truck</h3>
              <p className="quoteWizardQuestion">Do you need us to provide a truck, or will you use your own?</p>
              <div className="quoteWizardTruckGrid">
                <button type="button" className="quoteWizardBtnChoice" onClick={wizardChooseTruckYes}>
                  We need a truck
                </button>
                <button type="button" className="quoteWizardBtnChoice" onClick={wizardChooseTruckNo}>
                  We have a truck
                </button>
              </div>
              <div className="quoteWizardActions">
                <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                  Back
                </button>
                <button type="button" className="quoteWizardLink" onClick={wizardSkipTruckQuestion}>
                  Skip for now
                </button>
              </div>
            </>
          )}

          {wizardStep === 'truckSize' && (
            <>
              <h3 className="quoteWizardTitle">Truck size</h3>
              <p className="quoteWizardQuestion">What truck size do you need?</p>
              <div className="quoteWizardTruckGrid">
                {TRUCK_SIZES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`quoteWizardBtnChoice ${truckSize === t.id ? 'quoteWizardBtnChoiceActive' : ''}`}
                    onClick={() => wizardChooseTruckSize(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="quoteWizardActions">
                <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                  Back
                </button>
                <button type="button" className="quoteWizardBtnGhost" onClick={wizardSkipTruckSize}>
                  Skip for now
                </button>
              </div>
            </>
          )}

          {wizardStep === 'addresses' && (
            <>
              <h3 className="quoteWizardTitle">Stops</h3>
              <p className="quoteWizardQuestion">List every address involved in your move.</p>
              <ul className="quoteStopList">
                {destinations.map((d, i) => (
                  <li key={d.id} className="quoteStopRow">
                    <span className="quoteStopLabel">
                      {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
                    </span>
                    <AddressInput
                      value={d.address}
                      onChange={(address, lat, lon) => updateAddress(d.id, address, lat, lon)}
                      placeholder="Start typing address…"
                    />
                    <button
                      type="button"
                      className="quoteBtnIcon"
                      onClick={() => removeStop(d.id)}
                      disabled={destinations.length <= 2}
                      aria-label="Remove stop"
                    >
                      −
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="quoteBtnSecondary" onClick={addStop}>
                + Add stop
              </button>
              <div className="quoteWizardActions">
                <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                  Back
                </button>
                <button type="button" className="quoteWizardBtnPrimary" onClick={finishWizard}>
                  See my quote
                </button>
                <button type="button" className="quoteWizardLink" onClick={finishWizard}>
                  Skip for now
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {phase === 'tool' && (
        <div className="quoteApp">
          {toolHeader}
          <main className="quoteMain">
            {!hasGeoKey && (
              <p className="quoteKeyMissing no-print" style={{ marginBottom: 16 }}>
                Set GEOAPIFY_API_KEY in .env and restart the dev server.
              </p>
            )}
            <div className="quoteMainGrid">
              {stopsPanel}
              {quotePanel}
              {optionsPanel}
            </div>
          </main>

          {bookModalOpen && (
            <div className="quoteModalBackdrop" role="presentation" onClick={closeBookModal}>
              <div
                className="quoteModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="book-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                {bookSuccess ? (
                  <>
                    <h3 id="book-modal-title" className="quoteModalTitle">
                      Request sent
                    </h3>
                    <p className="quoteModalText">
                      Thanks! Somebody from our team will be in touch soon.
                    </p>
                    <div className="quoteModalActions">
                      <button type="button" className="quoteWizardBtnPrimary" onClick={closeBookModal}>
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 id="book-modal-title" className="quoteModalTitle">
                      Book Your Move
                    </h3>
                    <p className="quoteModalText">
                      We&apos;ll email this quote to our team along with your details. Phone is optional.
                    </p>
                    <label className="quoteModalHoneypot" htmlFor="book-move-hp" aria-hidden="true">
                      Company
                      <input
                        id="book-move-hp"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={bookHoneypot}
                        onChange={(e) => setBookHoneypot(e.target.value)}
                      />
                    </label>
                    <div className="quoteModalFields">
                      <label className="quoteModalLabel">
                        Name
                        <input
                          type="text"
                          className="quoteInput quoteModalInput"
                          value={bookName}
                          onChange={(e) => setBookName(e.target.value)}
                          autoComplete="name"
                          aria-required="true"
                        />
                      </label>
                      <label className="quoteModalLabel">
                        Email
                        <input
                          type="email"
                          className="quoteInput quoteModalInput"
                          value={bookEmail}
                          onChange={(e) => setBookEmail(e.target.value)}
                          autoComplete="email"
                          aria-required="true"
                        />
                      </label>
                      <label className="quoteModalLabel">
                        Phone <span className="quoteModalOptional">(optional)</span>
                        <input
                          type="tel"
                          className="quoteInput quoteModalInput"
                          value={bookPhone}
                          onChange={(e) => setBookPhone(e.target.value)}
                          autoComplete="tel"
                        />
                      </label>
                    </div>
                    {bookError && <p className="quoteModalError">{bookError}</p>}
                    <div className="quoteModalActions">
                      <button
                        type="button"
                        className="quoteWizardBtnGhost"
                        onClick={closeBookModal}
                        disabled={bookSending}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="quoteWizardBtnPrimary"
                        onClick={submitBookMove}
                        disabled={bookSending}
                      >
                        {bookSending ? 'Sending…' : 'Send to Coast Team'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
