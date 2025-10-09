import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section id="get-started" className="cta">
      <div className="container cta-inner">
        <div>
          <h2>Transform your delivery operations today</h2>
          <p>Join logistics companies across the Philippines using LogiSync. Start your 14-day free trial—no credit card required.</p>
        </div>
        <div>
          <Link className="btn btn-invert" to="/get-started">Start Free Trial</Link>
          <Link className="btn btn-ghost-invert" to="/#features">See a Demo</Link>
        </div>
      </div>
    </section>
  )
}
