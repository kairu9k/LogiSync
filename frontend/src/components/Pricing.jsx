export default function Pricing() {
  return (
    <section id="pricing" className="section container">
      <h2 className="section-title">Flexible pricing for Philippine logistics</h2>
      <div className="grid pricing">
        <article className="card">
          <h3>Starter</h3>
          <p className="price">₱1,499/mo</p>
          <ul>
            <li>Up to 5 drivers</li>
            <li>Real-time GPS tracking</li>
            <li>Basic capacity management</li>
            <li>Mobile driver app</li>
            <li>Email support</li>
          </ul>
          <a className="btn btn-primary" href="#get-started">Start Free Trial</a>
        </article>
        <article className="card">
          <h3>Professional</h3>
          <p className="price">₱3,999/mo</p>
          <ul>
            <li>Up to 20 drivers</li>
            <li>Custom pricing formula</li>
            <li>Multi-warehouse support</li>
            <li>Quote & order system</li>
            <li>Priority support</li>
          </ul>
          <a className="btn btn-primary" href="#get-started">Start Free Trial</a>
        </article>
        <article className="card">
          <h3>Enterprise</h3>
          <p className="price">Custom</p>
          <ul>
            <li>Unlimited drivers & vehicles</li>
            <li>Advanced analytics</li>
            <li>API access</li>
            <li>Dedicated account manager</li>
            <li>Custom integrations</li>
          </ul>
          <a className="btn btn-outline" href="#contact">Contact Sales</a>
        </article>
      </div>
    </section>
  )
}
