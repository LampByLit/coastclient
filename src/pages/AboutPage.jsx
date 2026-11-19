const GOOGLE_REVIEWS_URL = 'https://share.google/uKt4Jl6PG0gMrYDou'

const REVIEWS = [
  {
    url: 'https://share.google/pI06euO7Qh4cOOisB',
    text: [
      'Excellent service. Arrived on time. Moved the furniture without difficulty. Matt and Cameron were organized and very helpful. Would highly recommend them.',
    ],
  },
  {
    url: 'https://share.google/h4cPYKmrwAa35t88C',
    text: [
      'Great work by Matt and his team. Thank you for a smooth, efficient move!',
    ],
  },
  {
    url: 'https://share.google/Hp6Y1sn9G2RrZfhbm',
    text: [
      'When i first met Matt, he showed kindness and wanted to ensure the piece of furniture that someone had purchased from me was going to make it to its new home without the glasses being shattered ... that made me think " i might need his services" it happen yesterday ...Matt takes pride in serving his clients with joy and kindness and making sure the job is well done. Also i notice how well and clean his vehicule is kept. Thank you Matt for your professional service!!',
    ],
  },
  {
    url: 'https://share.google/gRXHhtKk4MCBbkfwH',
    text: [
      'Matt and his team were great. They worked hard, were efficient and had great attitudes. I would definitely hire them again.',
    ],
  },
  {
    url: 'https://share.google/QoCu0275xhnRSl4Cu',
    text: [
      'Matt and Cameron were absolutely amazing to work with! Their communication was thorough and transparent, they worked incredibly hard, and they treated every item with the utmost care.',
      'If you want peace of mind knowing your belongings are in good hands, these are your guys! I felt completely taken care of throughout the process.',
      'I highly recommend these professionals!',
    ],
  },
]

export default function AboutPage() {
  return (
    <div className="page">
      <div className="pageInner">
        <h1 className="pageTitle">About</h1>
        <p className="pageLead">
          Coast Team Moving specializes in residential or small commercial moving projects on Vancouver Island and beyond! See what clients are saying about our service. You can also read more reviews (and leave your own) on{' '}
          <a
            className="reviewsGoogleLink"
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google
          </a>
          .
        </p>

        <ul className="reviewList">
          {REVIEWS.map((review) => (
            <li key={review.url}>
              <article className="reviewCard">
                <header className="reviewCardHeader">
                  <p className="reviewRating" aria-label="5 out of 5 stars">
                    <span className="reviewScore">5.0</span>
                    <span className="reviewStars" aria-hidden="true">
                      ★★★★★
                    </span>
                  </p>
                </header>
                <div className="reviewBody">
                  {review.text.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
                <a
                  className="reviewSourceLink"
                  href={review.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Google
                </a>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
