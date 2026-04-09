import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { getAutocompleteSuggestions, geocodeAddress } from '../../api/geoapify'
import './AddressInput.css'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

/**
 * Autocomplete: debounced fetch with AbortController (avoids race → empty list),
 * suggestions in a document.body portal (avoids wizard/parent overflow clipping).
 */
export default function AddressInput({ value, onChange, placeholder = 'Address', inputClassName = 'qtInput' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [menuPos, setMenuPos] = useState(null)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const justSelectedRef = useRef(false)

  const syncMenuPosition = () => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
    })
  }

  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) {
      setMenuPos(null)
      return
    }
    syncMenuPosition()
    const onScrollOrResize = () => syncMenuPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, suggestions])

  useEffect(() => {
    const q = String(value || '').trim()
    if (q.length < MIN_QUERY_LEN) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      setLookupError(null)
      return
    }

    const ac = new AbortController()
    const t = window.setTimeout(() => {
      setLoading(true)
      setLookupError(null)
      getAutocompleteSuggestions(q, { signal: ac.signal })
        .then((list) => {
          setSuggestions(list || [])
          if (!justSelectedRef.current) {
            setOpen((list?.length ?? 0) > 0)
          }
          justSelectedRef.current = false
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          setSuggestions([])
          setOpen(false)
          setLookupError(err?.message || 'Address lookup failed')
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(t)
      ac.abort()
    }
  }, [value])

  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current?.contains(e.target)) return
      if (listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
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
    if (!value || String(value).trim().length < 3) return
    geocodeAddress(value.trim())
      .then((coords) => {
        if (coords && coords.lat != null && coords.lon != null) {
          onChange(value.trim(), coords.lat, coords.lon)
        }
      })
      .catch(() => {})
  }

  const dropdown =
    open &&
    suggestions.length > 0 &&
    menuPos &&
    createPortal(
      <ul
        ref={listRef}
        className="addressInputList addressInputListPortal"
        role="listbox"
        style={{
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 2147483647,
        }}
      >
        {suggestions.map((s, i) => (
          <li key={`${s.formatted}-${i}`} role="option">
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
      </ul>,
      document.body
    )

  return (
    <div className="addressInputWrap" ref={containerRef}>
      <input
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          if (value && suggestions.length > 0) setOpen(true)
        }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
      />
      {loading && <span className="addressInputSpinner" aria-hidden />}
      {lookupError && <p className="addressInputError">{lookupError}</p>}
      {dropdown}
    </div>
  )
}
