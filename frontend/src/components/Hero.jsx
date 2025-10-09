import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="hero container">
      <div className="hero-content">
        <h1>
          Smart Logistics Management for the Philippines
        </h1>
        <p className="lead">
          LogiSync powers your delivery operations across the Philippines with
          real-time GPS tracking, intelligent routing, and customizable pricing.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/get-started">Get Started</Link>
          <Link className="btn btn-outline" to="/#features">Learn More</Link>
          <Link className="btn btn-ghost" to="/#contact">Contact Sales</Link>
        </div>
        <div className="hero-stats">
          <div>
            <div className="stat">Real-Time</div>
            <div className="label">GPS Tracking</div>
          </div>
          <div>
            <div className="stat">Smart</div>
            <div className="label">Capacity Management</div>
          </div>
          <div>
            <div className="stat">Custom</div>
            <div className="label">Pricing Formula</div>
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
