import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section id="get-started" className="cta">
      <div className="container cta-inner">
        <div>
          <h2>Ready to sync your logistics?</h2>
          <p>Start your free trial in minutes. No credit card required.</p>
        </div>
        <div>
          <Link className="btn btn-invert" to="/get-started">Start Free Trial</Link>
          <Link className="btn btn-ghost-invert" to="/#features">See a Demo</Link>
        </div>
      </div>
    </section>
  )
}
