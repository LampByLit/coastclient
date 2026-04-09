export default function ContactPage() {
  return (
    <div className="page">
      <div className="pageInner narrow">
        <h1 className="pageTitle">Contact</h1>
        <p className="pageLead">
          Reach out for bookings, questions, or any inquiries regarding your move!
        </p>
        <ul className="contactList">
          <li>
            <span className="contactLabel">Email</span>
            <a className="contactValue" href="mailto:info@coastteammoving.com">
              info@coastteammoving.com
            </a>
          </li>
          <li>
            <span className="contactLabel">Phone</span>
            <a className="contactValue" href="tel:+18255616282">
              (825) 561-6282
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
