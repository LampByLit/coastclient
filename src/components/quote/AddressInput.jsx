import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { getAutocompleteSuggestions, geocodeAddress } from '../../api/geoapify'
import './AddressInput.css'

const DEBOUNCE_MS = 350

export default function AddressInput({ value, onChange, placeholder = 'Address', inputClassName = 'qtInput' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const debounceRef = useRef(null)
  const justSelectedRef = useRef(false)

  const updateMenuPosition = () => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200),
    })
  }

  useLayoutEffect(() => {
    if (!open || !suggestions.length) {
      setMenuPos(null)
      return
    }
    updateMenuPosition()
    const onScrollOrResize = () => updateMenuPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, suggestions])

  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
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
      const inWrap = containerRef.current?.contains(e.target)
      const inList = listRef.current?.contains(e.target)
      if (!inWrap && !inList) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (s) => {
    justSelectedRef.current = true
    onChange(s.formatted, s.lat, s.lon)
    setSuggestions([])
    setOpen(false)
  }

  const handleChange = (e) => {
    justSelectedRef.current = false
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

  const listEl =
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
          zIndex: 10000,
        }}
      >
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
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
      />
      {loading && <span className="addressInputSpinner" aria-hidden />}
      {listEl}
    </div>
  )
}
