import QuoteGenerator from '../quote/QuoteGenerator'

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="heroInner">
          <h1 id="hero-heading" className="heroTitle">
            Moving made easy.
          </h1>
          <p className="heroLead">
            The most affordable rates on Vancouver{'\u00a0'}Island.
          </p>
        </div>
      </section>

      <section className="section sectionQuote" id="quote-app" aria-label="Get a quote">
        <div className="sectionInner sectionInnerWide">
          <QuoteGenerator />
        </div>
      </section>
    </>
  )
}