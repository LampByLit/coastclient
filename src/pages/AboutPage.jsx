const GOOGLE_REVIEWS_URL = 'https://share.google/uKt4Jl6PG0gMrYDou'

const REVIEWS = [
  {
    author: 'Rachel Lyons',
    url: 'https://share.google/Im5vCPqhOp3eWY5GS',
    text: [
      'We had such an incredible experience with Coast Movers, and Matt was absolutely fantastic to work with.',
      'From the moment he arrived, he brought such a positive, calm energy to what could have been a really stressful day. Moving is never easy, especially after relocating across provinces, but Matt made the entire unloading process feel smooth and manageable. He was professional, efficient, and genuinely kind.',
      'What really stood out to me was how much he went above and beyond. He took the time to share recommendations for estate sales and thrift stores around the Island and gave us the warmest welcome to “paradise.” It didn’t feel transactional, it felt personal and thoughtful.',
      'He unloaded everything in about half the time we expected, which was so impressive. Every item was handled with care. Not a single scratch or broken piece. That level of attention and respect for our belongings meant a lot.',
      'I would 100% recommend Matt to any of my family or friends for moving help. Truly a 10 out of 10 experience.',
    ],
  },
  {
    author: 'Dr. Amira Fouda',
    url: 'https://share.google/8V14puM9ra5dS8TQq',
    text: [
      'We had a great experience with Coast team moving help team for unloading our U-Haul box. Matt was professional, efficient, and handled our items with care. Everything was unloaded quickly and organized exactly where we needed it.',
      'Moving can be incredibly stressful, especially when you’re new to the area, but they made the process smooth and worry-free. They were punctual, communicative, and very respectful throughout the entire job.',
      'We truly appreciated their positive attitude and willingness to go the extra mile. I would absolutely recommend them to anyone needing help with unloading or moving services.',
      'Thank you again for making our move so much easier!',
    ],
  },
  {
    author: 'Janick Bergeron',
    url: 'https://share.google/pul9Ge9DdQyCu7ViH',
    text: [
      'We hired Matt to help us move into our new home and he and his colleague were on time, energetic, strong, careful and efficient. They took very good care when handling our things.',
      'Also, their pleasant manners made them comfortable to be around. I highly recommend this team.',
    ],
  },
  {
    author: 'Wendy Hampton',
    url: 'https://share.google/oP0vGHlOe1wlK1Q0b',
    text: [
      'These guys made Ann’s move to Port Alberni Senior Complex so easy & stress free. Both Matt & Ryan were exceptional team of hard working movers. That’s where this team excels. So if your planing a move, I would not hesitate to call these guys. Also not a single item was broken. Now That’s Amazing. Thank You Matt & Ryan.',
    ],
  },
  {
    author: 'Danielle Brufatto',
    url: 'https://share.google/ZQe0GCLwA3y78MBNe',
    text: [
      'From the very beginning, Matt was super kind, communicative, and accommodating of adjustments to our timeline. I wasn\'t near as prepared I should\'ve been, yet somehow it all got efficiently loaded into the truck within the estimated time he gave. I\'ve hired movers in the island numerous times, but Matt & his helper were the best by far. Highly recommend!!',
    ],
  },
]

export default function AboutPage() {
  return (
    <div className="page">
      <div className="pageInner">
        <h1 className="pageTitle">About</h1>
        <p className="pageLead">
          Coast Team Moving specialize in residential or small commercial moving projects on Vancouver Island and beyond! See what clients are saying about our service. You can also read more reviews (and leave your own) on{' '}
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
                  <h2 className="reviewAuthor">{review.author}</h2>
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
