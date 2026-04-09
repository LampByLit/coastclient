import { useState, useEffect, useRef } from 'react'
import { getAutocompleteSuggestions, geocodeAddress } from '../../api/geoapify'
import './AddressInput.css'

const DEBOUNCE_MS = 350

/**
 * Same behavior as interior tool AddressInput: debounced autocomplete, blur geocode,
 * dropdown absolutely positioned under the input (same-origin /api or VITE_QUOTE_API_BASE).
 */
export default function AddressInput({ value, onChange, placeholder = 'Address', inputClassName = 'qtInput' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      setLookupError(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      setLookupError(null)
      getAutocompleteSuggestions(value)
        .then((list) => {
          setSuggestions(list || [])
          if (!justSelectedRef.current) {
            setOpen((list && list.length) > 0)
          }
          justSelectedRef.current = false
        })
        .catch((err) => {
          setSuggestions([])
          setOpen(false)
          setLookupError(err?.message || 'Address lookup failed')
        })
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
    setLookupError(null)
    onChange(s.formatted, s.lat, s.lon)
    setSuggestions([])
    setOpen(false)
  }

  const handleChange = (e) => {
    justSelectedRef.current = false
    setLookupError(null)
    const v = e.target.value
    if (typeof onChange === 'function') {
      if (v === '') {
        onChange('')
      } else {
        onChange(v)
      }
    }
  }

  const handleBlur = () => {
    if (!value || value.trim().length < 3) return
    geocodeAddress(value.trim())
      .then((coords) => {
        if (coords && coords.lat != null && coords.lon != null) {
          onChange(value.trim(), coords.lat, coords.lon)
        }
      })
      .catch(() => {})
  }

  return (
    <div className="addressInputWrap" ref={containerRef}>
      <input
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => value && suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {loading && <span className="addressInputSpinner" aria-hidden />}
      {lookupError && <p className="addressInputError">{lookupError}</p>}
      {open && suggestions.length > 0 && (
        <ul className="addressInputList" role="listbox">
          {suggestions.map((s, i) => (
            <li key={i} role="option">
              <button
                type="button"
                className="addressInputItem"
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
