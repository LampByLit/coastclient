export default function ContactPage() {
  return (
    <div className="page">
      <div className="pageInner narrow">
        <h1 className="pageTitle">Contact</h1>
        <p className="pageLead">
          Reach out for bookings, questions, or a walkthrough of your move.
        </p>
        <ul className="contactList">
          <li>
            <span className="contactLabel">Email</span>
            <a className="contactValue" href="mailto:hello@coastteammoving.com">
              hello@coastteammoving.com
            </a>
          </li>
          <li>
            <span className="contactLabel">Phone</span>
            <span className="contactValue contactPlaceholder">Add your number</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
