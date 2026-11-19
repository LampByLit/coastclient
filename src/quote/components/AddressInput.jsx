import { useState, useEffect, useRef } from 'react'
import { getAutocompleteSuggestions, geocodeAddress } from '../api/geoapifyClient'
import './AddressInput.css'

const DEBOUNCE_MS = 350

export default function AddressInput({ id, value, onChange, placeholder = 'Address' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      getAutocompleteSuggestions(value)
        .then((list) => {
          setSuggestions(list || [])
          if (!justSelectedRef.current) {
            setOpen((list && list.length) > 0)
          }
          justSelectedRef.current = false
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (s) => {
    justSelectedRef.current = true
    onChange(s.formatted, s.lat, s.lon, s.city || '')
    setSuggestions([])
    setOpen(false)
  }

  const handleChange = (e) => {
    justSelectedRef.current = false
    const v = e.target.value
    onChange(v, null, null, '')
  }

  const handleBlur = () => {
    if (justSelectedRef.current) return
    if (!value || value.trim().length < 3) return
    const typed = value.trim()
    geocodeAddress(typed)
      .then((coords) => {
        if (coords && coords.lat != null && coords.lon != null) {
          onChange(typed, coords.lat, coords.lon, coords.city || '')
        }
      })
      .catch(() => {})
  }

  return (
    <div
      className={`quoteAddressInputWrap${open ? ' quoteAddressInputWrapOpen' : ''}`}
      ref={containerRef}
    >
      <input
        id={id}
        name={id}
        type="text"
        className="quoteInput"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => value && suggestions.length > 0 && setOpen(true)}
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        aria-autocomplete="list"
      />
      {loading && <span className="quoteAddressInputSpinner" aria-hidden />}
      {open && suggestions.length > 0 && (
        <ul className="quoteAddressInputList">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="quoteAddressInputItem"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
              >
                {s.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
