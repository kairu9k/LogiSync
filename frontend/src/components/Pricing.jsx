export default function Pricing() {
  return (
    <section id="pricing" className="section container">
      <h2 className="section-title">Simple pricing that scales</h2>
      <div className="grid pricing">
        <article className="card">
          <h3>Starter</h3>
          <p className="price">$29/mo</p>
          <ul>
            <li>Up to 3 users</li>
            <li>Live Tracking</li>
            <li>Email Support</li>
          </ul>
          <a className="btn btn-primary" href="#get-started">Choose Starter</a>
        </article>
        <article className="card">
          <h3>Growth</h3>
          <p className="price">$99/mo</p>
          <ul>
            <li>Up to 15 users</li>
            <li>Automations</li>
            <li>Priority Support</li>
          </ul>
          <a className="btn btn-primary" href="#get-started">Choose Growth</a>
        </article>
        <article className="card">
          <h3>Enterprise</h3>
          <p className="price">Let's talk</p>
          <ul>
            <li>Unlimited users</li>
            <li>SSO & Audit Logs</li>
            <li>Dedicated Manager</li>
          </ul>
          <a className="btn btn-outline" href="#contact">Contact Sales</a>
        </article>
      </div>
    </section>
  )
}
