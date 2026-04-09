import { useState } from 'react'
import { TRUCK_SIZES } from '../../data/uhaul'
import AddressInput from './AddressInput'
import './QuoteTool.css'
import './QuoteWizard.css'

const S_DATE = 0
const S_TRUCK = 1
const S_SIZE = 2
const S_ADDR = 3

function cloneDestinations(list) {
  return list.map((d) => ({ ...d }))
}

export default function QuoteWizard({ onComplete }) {
  const [step, setStep] = useState(S_DATE)
  const [moveDate, setMoveDate] = useState('')
  const [needsTruck, setNeedsTruck] = useState(true)
  const [truckSize, setTruckSize] = useState(TRUCK_SIZES[0].id)
  const [destinations, setDestinations] = useState([
    { id: 1, address: '', lat: null, lon: null },
    { id: 2, address: '', lat: null, lon: null },
  ])

  const stepTotal = needsTruck ? 4 : 3
  const stepNum =
    step === S_DATE ? 1 : step === S_TRUCK ? 2 : step === S_SIZE ? 3 : stepTotal

  const goNextFromTruck = () => {
    if (needsTruck) setStep(S_SIZE)
    else setStep(S_ADDR)
  }

  const goBack = () => {
    if (step === S_ADDR) {
      setStep(needsTruck ? S_SIZE : S_TRUCK)
    } else if (step === S_SIZE) {
      setStep(S_TRUCK)
    } else if (step === S_TRUCK) {
      setStep(S_DATE)
    }
  }

  const skipDate = () => {
    setMoveDate('')
    setStep(S_TRUCK)
  }

  const skipTruck = () => {
    setNeedsTruck(true)
    setStep(S_SIZE)
  }

  const skipSize = () => {
    setTruckSize(TRUCK_SIZES[0].id)
    setStep(S_ADDR)
  }

  const skipAddresses = () => {
    finish({
      selectedDate: moveDate,
      needsTruck,
      truckSize: needsTruck ? truckSize : TRUCK_SIZES[0].id,
      destinations: [
        { id: 1, address: '', lat: null, lon: null },
        { id: 2, address: '', lat: null, lon: null },
      ],
    })
  }

  const finish = (payload) => {
    onComplete({
      selectedDate: payload.selectedDate || '',
      needsTruck: payload.needsTruck,
      truckSize: payload.truckSize,
      destinations: cloneDestinations(payload.destinations),
    })
  }

  const submitAddresses = () => {
    finish({
      selectedDate: moveDate,
      needsTruck,
      truckSize,
      destinations,
    })
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

  let body = null
  if (step === S_DATE) {
    body = (
      <>
        <p className="quoteWizardTitle">What date do you require your move?</p>
        <div className="quoteWizardBody">
          <input
            type="date"
            className="qtInput inputDate"
            value={moveDate}
            onChange={(e) => setMoveDate(e.target.value)}
            aria-label="Move date"
          />
        </div>
        <div className="quoteWizardActions quoteWizardActionsSpaced">
          <button type="button" className="quoteWizardBtnSkip" onClick={skipDate}>
            Skip for now
          </button>
          <button type="button" className="quoteWizardBtn quoteWizardBtnPrimary" onClick={() => setStep(S_TRUCK)}>
            Next
          </button>
        </div>
      </>
    )
  } else if (step === S_TRUCK) {
    body = (
      <>
        <p className="quoteWizardTitle">Do you require a truck, or will you acquire one yourself?</p>
        <div className="quoteWizardBody">
          <div className="quoteWizardYesNo">
            <button
              type="button"
              className={`quoteWizardBtn ${needsTruck ? 'quoteWizardBtnPrimary' : 'quoteWizardBtnGhost'}`}
              onClick={() => setNeedsTruck(true)}
            >
              We need a truck
            </button>
            <button
              type="button"
              className={`quoteWizardBtn ${!needsTruck ? 'quoteWizardBtnPrimary' : 'quoteWizardBtnGhost'}`}
              onClick={() => setNeedsTruck(false)}
            >
              I&apos;ll get my own
            </button>
          </div>
        </div>
        <div className="quoteWizardActions quoteWizardActionsSpaced">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="quoteWizardBtn quoteWizardBtnGhost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="quoteWizardBtnSkip" onClick={skipTruck}>
              Skip for now
            </button>
          </div>
          <button type="button" className="quoteWizardBtn quoteWizardBtnPrimary" onClick={goNextFromTruck}>
            Next
          </button>
        </div>
      </>
    )
  } else if (step === S_SIZE) {
    body = (
      <>
        <p className="quoteWizardTitle">What truck size do you require?</p>
        <div className="quoteWizardBody">
          <div className="quoteWizardTruckGrid">
            {TRUCK_SIZES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`quoteWizardTruckBtn ${truckSize === t.id ? 'quoteWizardTruckBtnActive' : ''}`}
                onClick={() => setTruckSize(t.id)}
              >
                <span>{t.label}</span>
                {t.cubicFeet != null && <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{t.cubicFeet.toLocaleString()} cu ft</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="quoteWizardActions quoteWizardActionsSpaced">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="quoteWizardBtn quoteWizardBtnGhost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="quoteWizardBtnSkip" onClick={skipSize}>
              Skip for now
            </button>
          </div>
          <button type="button" className="quoteWizardBtn quoteWizardBtnPrimary" onClick={() => setStep(S_ADDR)}>
            Next
          </button>
        </div>
      </>
    )
  } else if (step === S_ADDR) {
    body = (
      <>
        <p className="quoteWizardTitle">List all addresses (stops) for your move</p>
        <p className="quoteWizardHint">Origin first, destination last; add stops in between if needed.</p>
        <div className="quoteWizardBody">
          <ul className="quoteWizardStopList">
            {destinations.map((d, i) => (
              <li key={d.id} className="quoteWizardStopRow">
                <span className="quoteWizardStopLabel">
                  {i === 0 ? 'Origin' : i === destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`}
                </span>
                <AddressInput
                  value={d.address}
                  onChange={(address, lat, lon) => updateAddress(d.id, address, lat, lon)}
                  placeholder="Start typing address..."
                />
                <button
                  type="button"
                  className="quoteWizardRemove"
                  onClick={() => removeStop(d.id)}
                  disabled={destinations.length <= 2}
                  aria-label="Remove stop"
                >
                  −
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="quoteWizardBtn quoteWizardBtnGhost" onClick={addStop}>
            + Add stop
          </button>
        </div>
        <div className="quoteWizardActions quoteWizardActionsSpaced">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="quoteWizardBtn quoteWizardBtnGhost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="quoteWizardBtnSkip" onClick={skipAddresses}>
              Skip for now
            </button>
          </div>
          <button type="button" className="quoteWizardBtn quoteWizardBtnPrimary" onClick={submitAddresses}>
            See my quote
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="quoteWizard">
      <p className="quoteWizardProgress">
        Step {stepNum} of {stepTotal}
      </p>
      {body}
    </div>
  )
}
