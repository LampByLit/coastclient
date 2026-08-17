import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import logoFallback from '../assets/logo-fallback.svg'

function LayoutWatermark() {
  const [src, setSrc] = useState('/Coast Logo Full SIze.png')

  return (
    <div className="layoutWatermark" aria-hidden="true">
      <img
        className="layoutWatermark__img"
        src={src}
        alt=""
        decoding="async"
        onError={() =>
          setSrc((current) => {
            if (current === '/Coast Logo Full SIze.png') return '/logo.png'
            if (current === '/logo.png') return logoFallback
            return current
          })
        }
      />
    </div>
  )
}

export default function Layout() {
  return (
    <div className="layout">
      <LayoutWatermark />
      <main className="siteMain">
        <Outlet />
      </main>
    </div>
  )
}
