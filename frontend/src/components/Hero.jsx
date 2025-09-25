import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="hero container">
      <div className="hero-content">
        <h1>
          Streamline your logistics with speed, clarity, and control
        </h1>
        <p className="lead">
          LogiSync helps teams orchestrate shipments, track inventory, and
          collaborate in real-time—all in one beautiful dashboard.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/get-started">Get Started</Link>
          <Link className="btn btn-outline" to="/#features">Learn More</Link>
          <Link className="btn btn-ghost" to="/#contact">Contact Sales</Link>
        </div>
        <div className="hero-stats">
          <div>
            <div className="stat">10k+</div>
            <div className="label">Active Users</div>
          </div>
          <div>
            <div className="stat">99.99%</div>
            <div className="label">Uptime</div>
          </div>
          <div>
            <div className="stat">2x</div>
            <div className="label">Faster Fulfillment</div>
          </div>
        </div>
      </div>
      <div className="hero-media">
        <div className="glass card-lg">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
    </section>
  )
}
