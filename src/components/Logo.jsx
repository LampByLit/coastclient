import { Link } from 'react-router-dom'
import { useState } from 'react'
import fallbackUrl from '../assets/logo-fallback.svg'

export default function Logo({ className = '' }) {
  const [src, setSrc] = useState('/logo.png')

  return (
    <Link to="/" className={`logoLink ${className}`.trim()}>
      <img
        className="siteLogo"
        src={src}
        alt="Coast Team Moving"
        width={220}
        height={56}
        decoding="async"
        onError={() => {
          setSrc((current) => (current === fallbackUrl ? current : fallbackUrl))
        }}
      />
    </Link>
  )
}
