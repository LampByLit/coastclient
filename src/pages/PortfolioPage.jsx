export default function PortfolioPage() {
  return (
    <div className="page">
      <div className="pageInner">
        <h1 className="pageTitle">Portfolio</h1>
        <p className="pageLead">
          Photos and stories from recent moves will go here.
        </p>
        <div className="emptyState" aria-hidden="true">
          <span className="emptyStateLine" />
          <span className="emptyStateLine short" />
          <span className="emptyStateLine" />
        </div>
      </div>
    </div>
  )
}
