import QuoteGenerator from '../components/quote/QuoteGenerator'

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="heroInner">
          <h1 id="hero-heading" className="heroTitle">
            Moving made easy.
          </h1>
          <p className="heroLead">
            Straightforward quotes and careful crews
            <br />
            with the most affordable rates on Vancouver{'\u00a0'}Island.
          </p>
        </div>
      </section>

      <section className="section" id="quote-app" aria-label="Moving quote">
        <div className="sectionInner sectionInnerQuote">
          <QuoteGenerator />
        </div>
      </section>
    </>
  )
}
