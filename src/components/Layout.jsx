import { NavLink, Outlet } from 'react-router-dom'
import Logo from './Logo'

const navClass = ({ isActive }) =>
  `navLink ${isActive ? 'navLinkActive' : ''}`.trim()

export default function Layout() {
  return (
    <div className="layout">
      <header className="siteHeader">
        <div className="headerInner">
          <Logo />
          <nav className="siteNav" aria-label="Main">
            <NavLink to="/portfolio" className={navClass}>
              Portfolio
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

      <footer className="siteFooter">
        <p className="footerText">© {new Date().getFullYear()} Coast Team Moving</p>
      </footer>
    </div>
  )
}
