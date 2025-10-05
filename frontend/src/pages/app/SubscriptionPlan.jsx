export default function SubscriptionPlan() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Subscription Plan</h1>
      <p className="muted">Manage your subscription and billing</p>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
        {/* Basic Plan */}
        <div className="card" style={{ border: '2px solid var(--border-200)' }}>
          <h3 style={{ marginTop: 0 }}>Basic</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '16px 0' }}>Free</div>
          <p className="muted" style={{ fontSize: '14px' }}>30-day free trial</p>
          <ul style={{ marginTop: 16, paddingLeft: 20, fontSize: '14px' }}>
            <li>Limited features</li>
            <li>Basic support</li>
            <li>Up to 10 shipments</li>
          </ul>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: 16 }} disabled>
            Current Plan
          </button>
        </div>

        {/* Standard Plan */}
        <div className="card" style={{ border: '2px solid var(--primary-500)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, right: 16, background: 'var(--primary-500)', color: 'white', padding: '4px 12px', borderRadius: 12, fontSize: '12px', fontWeight: 'bold' }}>
            POPULAR
          </div>
          <h3 style={{ marginTop: 0 }}>Standard</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '16px 0' }}>₱999<span style={{ fontSize: '16px', fontWeight: 'normal' }}>/mo</span></div>
          <p className="muted" style={{ fontSize: '14px' }}>All core features</p>
          <ul style={{ marginTop: 16, paddingLeft: 20, fontSize: '14px' }}>
            <li>Up to 100 shipments/month</li>
            <li>Up to 10 warehouses</li>
            <li>Email support</li>
            <li>Full tracking & reporting</li>
          </ul>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>
            Upgrade
          </button>
        </div>

        {/* Premium Plan */}
        <div className="card" style={{ border: '2px solid var(--border-200)' }}>
          <h3 style={{ marginTop: 0 }}>Premium</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '16px 0' }}>₱2,499<span style={{ fontSize: '16px', fontWeight: 'normal' }}>/mo</span></div>
          <p className="muted" style={{ fontSize: '14px' }}>Unlimited everything</p>
          <ul style={{ marginTop: 16, paddingLeft: 20, fontSize: '14px' }}>
            <li>Unlimited shipments</li>
            <li>Unlimited warehouses</li>
            <li>Priority support</li>
            <li>Advanced analytics</li>
          </ul>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: 16 }}>
            Upgrade
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Billing Information</h3>
        <p className="muted">Coming soon: Manage payment methods and billing history</p>
      </div>
    </div>
  )
}
