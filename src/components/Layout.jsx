import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import Logo from './Logo'
import logoFallback from '../assets/logo-fallback.svg'

const navClass = ({ isActive }) =>
  `navLink ${isActive ? 'navLinkActive' : ''}`.trim()

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
      <header className="siteHeader">
        <div className="headerInner">
          <Logo />
          <nav className="siteNav" aria-label="Main">
            <NavLink to="/" className={navClass} end>
              BOOK YOUR MOVE
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={navClass}>
              Contact
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="siteMain">
        <Outlet />
      </main>

      {/* Footer removed per request — restore if needed
      <footer className="siteFooter">
        <p className="footerText">© {new Date().getFullYear()} Coast Team Moving</p>
      </footer>
      */}
    </div>
  )
}
