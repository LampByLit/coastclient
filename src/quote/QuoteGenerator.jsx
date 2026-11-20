import { useState } from 'react'
import {
  DEFAULT_MOVERS,
  MIN_HOURS_PER_MOVER,
  MIN_MOVERS,
  SQ_FT_BANDS,
  getSqFtBand,
  hoursPerMoverForSqFtBand,
} from './data/pricing'
import { geocodeAddress } from './api/geoapifyClient'
import AddressInput from './components/AddressInput'
import { buildBookingMessage } from './buildBookMovePlainText'
import './QuoteGenerator.css'

const WIZARD_STEPS = { contact: 1, date: 2, movers: 3, addresses: 4 }
const TOTAL_STEPS = 4
const THANK_YOU = [
  'Your request has been submitted and a member of our team will reach out to you very shortly.',
  'Have a great day and thank you for choosing Coast Team to serve you!',
]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

function phoneDigits(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

function nextId(list) {
  return Math.max(0, ...list.map((item) => item.id)) + 1
}

function emptyStops() {
  return [
    { id: 1, address: '', lat: null, lon: null, city: '' },
    { id: 2, address: '', lat: null, lon: null, city: '' },
  ]
}

async function stopsWithCities(stops) {
  return Promise.all(
    stops.map(async (stop) => {
      const address = stop.address.trim()
      if (!address || stop.city?.trim()) return { ...stop, address }
      try {
        const found = await geocodeAddress(address)
        if (!found) return { ...stop, address }
        return {
          ...stop,
          address,
          lat: found.lat,
          lon: found.lon,
          city: found.city || '',
        }
      } catch {
        return { ...stop, address }
      }
    })
  )
}

export default function QuoteGenerator() {
  const [phase, setPhase] = useState('wizard')
  const [wizardStep, setWizardStep] = useState('contact')
  const [submitted, setSubmitted] = useState(false)
  const [previewBody, setPreviewBody] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [moverCount, setMoverCount] = useState(DEFAULT_MOVERS)
  const [squareFootageBand, setSquareFootageBand] = useState('')
  const [isApartment, setIsApartment] = useState(false)
  const [destinations, setDestinations] = useState(() => emptyStops())
  const [moveDetails, setMoveDetails] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const web3formsAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim()
  const wizardStepNumber = WIZARD_STEPS[wizardStep] || 1
  const estimatedHours = hoursPerMoverForSqFtBand(squareFootageBand)

  const renderSquareFootageSelect = (id) => (
    <label className="quoteMoveDetailsField" htmlFor={id}>
      <span className="quoteMoveDetailsFieldLabel">Approx. square footage</span>
      <select
        id={id}
        className="quoteInput quoteMoveDetailsSelect"
        value={squareFootageBand}
        onChange={(e) => setSquareFootageBand(e.target.value)}
        aria-label="Approximate square footage"
      >
        <option value="">Select size…</option>
        {SQ_FT_BANDS.map((band) => (
          <option key={band.id} value={band.id}>
            {band.label}
          </option>
        ))}
      </select>
    </label>
  )

  const renderMoveDetailsFields = (idPrefix) => (
    <div className="quoteMoveDetails">
      <p className="quoteMoveDetailsLabel">Move details</p>
      <div className="quoteMoveDetailsMeta">
        <label className="quoteToggleRow quoteMoveDetailsApartment">
          <input
            type="checkbox"
            checked={isApartment}
            onChange={(e) => setIsApartment(e.target.checked)}
          />
          <span>Apartment</span>
        </label>
      </div>
      <label className="quoteMoveDetailsFieldLabel" htmlFor={`${idPrefix}-move-details`}>
        Additional notes
      </label>
      <textarea
        id={`${idPrefix}-move-details`}
        className="quoteInput quoteTextarea"
        placeholder="Stairs, fragile items, timing, access, etc."
        value={moveDetails}
        onChange={(e) => setMoveDetails(e.target.value)}
        rows={4}
        aria-label="Additional move details"
      />
    </div>
  )

  const skipTo = (step) => {
    setError('')
    setWizardStep(step)
  }

  const openConfig = () => {
    setError('')
    setPhase('config')
  }

  const updateAddress = (id, address, lat, lon, city) => {
    setDestinations((prev) =>
      prev.map((stop) =>
        stop.id === id
          ? {
              ...stop,
              address,
              lat: lat ?? null,
              lon: lon ?? null,
              city: city || '',
            }
          : stop
      )
    )
  }

  const addStop = () => {
    setDestinations((prev) => [
      ...prev,
      { id: nextId(prev), address: '', lat: null, lon: null, city: '' },
    ])
  }

  const removeStop = (id) => {
    if (destinations.length <= 2) return
    setDestinations((prev) => prev.filter((stop) => stop.id !== id))
  }

  const missingFields = []
  if (!name.trim()) missingFields.push('name')
  if (phoneDigits(phone).length !== 10) missingFields.push('phone')
  if (!isValidEmail(email)) missingFields.push('email')
  if (!moveDate) missingFields.push('move date')
  if (!Number.isFinite(Number(moverCount)) || Number(moverCount) < MIN_MOVERS) missingFields.push('movers')
  if (!squareFootageBand) missingFields.push('square footage')
  if (!destinations.some((stop) => stop.address.trim())) missingFields.push('an address')
  const canBook = missingFields.length === 0

  const goNextFromContact = () => {
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (phoneDigits(phone).length !== 10) {
      setError('Please enter a 10-digit phone number.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setWizardStep('date')
  }

  const goNextFromDate = () => {
    if (!moveDate) {
      setError('Please choose a move date.')
      return
    }
    setError('')
    setWizardStep('movers')
  }

  const goNextFromMovers = () => {
    const count = Number(moverCount)
    if (!Number.isFinite(count) || count < MIN_MOVERS) {
      setError('At least one mover is required.')
      return
    }
    setError('')
    setWizardStep('addresses')
  }

  const wizardBack = () => {
    setError('')
    if (wizardStep === 'date') setWizardStep('contact')
    else if (wizardStep === 'movers') setWizardStep('date')
    else if (wizardStep === 'addresses') setWizardStep('movers')
  }

  const submitRequest = async () => {
    if (!canBook || honeypot.trim()) return

    setSending(true)
    setError('')
    try {
      const resolved = await stopsWithCities(destinations)
      setDestinations(resolved)
      const { subject, body } = buildBookingMessage({
        name,
        phone,
        email,
        moveDate,
        moverCount,
        hours: hoursPerMoverForSqFtBand(squareFootageBand),
        destinations: resolved,
        moveDetails,
        squareFootageLabel: getSqFtBand(squareFootageBand)?.label ?? '',
        isApartment,
      })
      if (!web3formsAccessKey) {
        if (import.meta.env.DEV) {
          setPreviewBody(body)
          setSubmitted(true)
        } else {
          setError('Booking form is not configured. Add VITE_WEB3FORMS_ACCESS_KEY to your environment.')
        }
        return
      }
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: web3formsAccessKey,
          subject,
          from_name: 'Coast Team Moving website',
          message: body,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const apiMessage =
        (typeof data.body?.message === 'string' && data.body.message) ||
        (typeof data.message === 'string' && data.message) ||
        ''
      if (res.ok && data.success) {
        setSubmitted(true)
      } else {
        setError(apiMessage || `Could not send (${res.status}). Please try again or call us.`)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (submitted) {
    return (
      <div className="quoteGen">
        <div className="quoteWizard">
          {THANK_YOU.map((sentence) => (
            <p key={sentence} className="quoteWizardQuestion">
              {sentence}
            </p>
          ))}
          {previewBody && (
            <>
              <p className="quoteOptionalHint">Local preview only. This was not emailed.</p>
              <pre className="quotePreview">{previewBody}</pre>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'config') {
    return (
      <div className="quoteGen">
        <div className="quoteApp">
          <header className="quoteAppBar no-print">
            <div className="quoteAppBarActions no-print" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="quoteBtnBar"
                onClick={submitRequest}
                disabled={!canBook || sending}
                title={canBook ? 'Send this request' : `Still needed: ${missingFields.join(', ')}`}
                aria-label="Confirm"
              >
                {sending ? 'Sending…' : 'CONFIRM'}
              </button>
            </div>
          </header>
          <main className="quoteMain">
            <label className="quoteModalHoneypot" htmlFor="book-move-hp-config" aria-hidden="true">
              Company
              <input
                id="book-move-hp-config"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
            {error && <p className="quoteWizardError no-print">{error}</p>}
            <div className="quoteMainGrid quoteConfigLayout no-print">
              <section className="quoteCard quoteMainLeft">
                <h3 className="quoteCardTitle">Stops</h3>
                <div className="quoteOptionalSection quoteOptionalSectionTop">
                  <label className="quoteModalLabel">
                    Move date
                    <input
                      type="date"
                      className="quoteInput quoteWizardDate"
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      aria-label="Move date"
                    />
                  </label>
                </div>
                <p className="quoteCardHint">Add every stop for your move.</p>
                <ul className="quoteStopList">
                  {destinations.map((stop, index) => (
                    <li key={stop.id} className="quoteStopRow">
                      <span className="quoteStopLabel">
                        {index === 0
                          ? 'Origin'
                          : index === destinations.length - 1
                            ? 'Destination'
                            : `Stop ${index + 1}`}
                      </span>
                      <AddressInput
                        id={`config-stop-${stop.id}`}
                        value={stop.address}
                        onChange={(address, lat, lon, city) => updateAddress(stop.id, address, lat, lon, city)}
                        placeholder="Start typing address…"
                      />
                      <button
                        type="button"
                        className="quoteBtnIcon"
                        onClick={() => removeStop(stop.id)}
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
                {renderMoveDetailsFields('config')}
              </section>
              <section className="quoteCard quoteMainRight">
                <h3 className="quoteCardTitle">Contact</h3>
                <div className="quoteModalFields">
                  <label className="quoteModalLabel">
                    Name
                    <input
                      type="text"
                      className="quoteInput"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label className="quoteModalLabel">
                    Phone
                    <input
                      type="tel"
                      className="quoteInput"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="quoteModalLabel">
                    Email
                    <input
                      type="email"
                      className="quoteInput"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </label>
                </div>
                <h3 className="quoteCardTitle" style={{ marginTop: 22 }}>
                  Crew
                </h3>
                <p className="quoteCardHint">
                  One mover can be booked. Hours in your calendar invite are estimated from square footage (
                  {squareFootageBand ? `${estimatedHours} hrs` : `min ${MIN_HOURS_PER_MOVER} hrs`}).
                </p>
                <div className="quoteModalFields">
                  <label className="quoteModalLabel">
                    Movers
                    <input
                      type="number"
                      className="quoteInput quoteWizardNumber"
                      min={MIN_MOVERS}
                      step={1}
                      value={moverCount}
                      onChange={(e) => setMoverCount(e.target.value)}
                      aria-label="Number of movers"
                    />
                  </label>
                </div>
                <div className="quoteMoveDetailsMeta" style={{ marginTop: 16 }}>
                  {renderSquareFootageSelect('config-crew-sqft')}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="quoteGen">
      <div className="quoteWizard">
        <p className="quoteWizardStep">
          Step {wizardStepNumber} of {TOTAL_STEPS}
        </p>

        <label className="quoteModalHoneypot" htmlFor="book-move-hp" aria-hidden="true">
          Company
          <input
            id="book-move-hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>

        {wizardStep === 'contact' && (
          <>
            <h3 className="quoteWizardTitle">Your details</h3>
            <p className="quoteWizardQuestion">How should we reach you?</p>
            <div className="quoteModalFields">
              <label className="quoteModalLabel">
                Name
                <input
                  type="text"
                  className="quoteInput"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-required="true"
                />
              </label>
              <label className="quoteModalLabel">
                Phone
                <input
                  type="tel"
                  className="quoteInput"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  aria-required="true"
                />
              </label>
              <label className="quoteModalLabel">
                Email
                <input
                  type="email"
                  className="quoteInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-required="true"
                />
              </label>
            </div>
            {error && <p className="quoteWizardError">{error}</p>}
            <div className="quoteWizardActions">
              <button type="button" className="quoteWizardBtnPrimary" onClick={goNextFromContact}>
                Next
              </button>
              <button type="button" className="quoteWizardLink" onClick={() => skipTo('date')}>
                Skip for now
              </button>
            </div>
          </>
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
              required
            />
            {error && <p className="quoteWizardError">{error}</p>}
            <div className="quoteWizardActions">
              <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                Back
              </button>
              <button type="button" className="quoteWizardBtnPrimary" onClick={goNextFromDate}>
                Next
              </button>
              <button type="button" className="quoteWizardLink" onClick={() => skipTo('movers')}>
                Skip for now
              </button>
            </div>
          </>
        )}

        {wizardStep === 'movers' && (
          <>
            <h3 className="quoteWizardTitle">Crew</h3>
            <p className="quoteWizardQuestion">How many movers do you need?</p>
            <p className="quoteOptionalHint">
              Starts at {DEFAULT_MOVERS} movers. One mover can be booked. We estimate booked hours from square
              footage.
            </p>
            <div className="quoteModalFields">
              <label className="quoteModalLabel">
                Movers
                <input
                  type="number"
                  className="quoteInput quoteWizardNumber"
                  min={MIN_MOVERS}
                  step={1}
                  value={moverCount}
                  onChange={(e) => setMoverCount(e.target.value)}
                  aria-label="Number of movers"
                />
              </label>
            </div>
            <div className="quoteMoveDetailsMeta" style={{ marginTop: 16 }}>
              {renderSquareFootageSelect('wizard-crew-sqft')}
            </div>
            {error && <p className="quoteWizardError">{error}</p>}
            <div className="quoteWizardActions">
              <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                Back
              </button>
              <button type="button" className="quoteWizardBtnPrimary" onClick={goNextFromMovers}>
                Next
              </button>
              <button type="button" className="quoteWizardLink" onClick={() => skipTo('addresses')}>
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
              {destinations.map((stop, index) => (
                <li key={stop.id} className="quoteStopRow">
                  <span className="quoteStopLabel">
                    {index === 0
                      ? 'Origin'
                      : index === destinations.length - 1
                        ? 'Destination'
                        : `Stop ${index + 1}`}
                  </span>
                  <AddressInput
                    id={`wizard-stop-${stop.id}`}
                    value={stop.address}
                    onChange={(address, lat, lon, city) => updateAddress(stop.id, address, lat, lon, city)}
                    placeholder="Start typing address…"
                  />
                  <button
                    type="button"
                    className="quoteBtnIcon"
                    onClick={() => removeStop(stop.id)}
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
            <div className="quoteMoveDetailsWizard">{renderMoveDetailsFields('wizard')}</div>
            {error && <p className="quoteWizardError">{error}</p>}
            <div className="quoteWizardActions">
              <button type="button" className="quoteWizardLink quoteWizardBack" onClick={wizardBack}>
                Back
              </button>
              <button type="button" className="quoteWizardBtnPrimary" onClick={openConfig}>
                Continue
              </button>
              <button type="button" className="quoteWizardLink" onClick={openConfig}>
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
