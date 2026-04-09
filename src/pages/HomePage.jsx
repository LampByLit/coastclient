import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="heroInner">
          <h1 id="hero-heading" className="heroTitle">
            Moving made clear.
          </h1>
          <p className="heroLead">
            Straightforward quotes and careful crews along the coast.
          </p>
          <div className="heroActions">
            <a href="#quote-app" className="btn btnPrimary">
              Get a quote
            </a>
            <Link to="/contact" className="btn btnGhost">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="quote-app" aria-labelledby="quote-heading">
        <div className="sectionInner">
          <h2 id="quote-heading" className="sectionTitle">
            Quote generator
          </h2>
          <p className="sectionLead">
            Your moving quote tool will live here — same logic as your interior app, wired to
            your API and calendar when ready.
          </p>
          <div className="quoteAppShell" role="region" aria-label="Quote app placeholder">
            <p className="quoteAppShellText">Quote app mount point</p>
          </div>
        </div>
      </section>
    </>
  )
}
