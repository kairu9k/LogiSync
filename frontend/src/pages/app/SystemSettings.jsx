export default function SystemSettings() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>System Settings</h1>
      <p className="muted">Configure system preferences and integrations</p>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>General Settings</h3>
        <div style={{ marginTop: 16 }}>
          <label className="label">Company Name</label>
          <input type="text" placeholder="Your company name" defaultValue="LogiSync Inc." />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label">Company Email</label>
          <input type="email" placeholder="contact@example.com" defaultValue="admin@logisync.com" />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label">Time Zone</label>
          <select defaultValue="Asia/Manila">
            <option value="Asia/Manila">Asia/Manila (PHT)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}>
          Save Changes
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Notifications</h3>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Email notifications for new orders</span>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Email notifications for shipment updates</span>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" />
            <span>SMS notifications for urgent alerts</span>
          </label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}>
          Save Changes
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Integrations</h3>
        <p className="muted">Coming soon: Connect with third-party services</p>
        <ul style={{ marginTop: 16, paddingLeft: 20 }}>
          <li>Payment Gateways (PayPal, Stripe)</li>
          <li>GPS Tracking Services</li>
          <li>Email Service Providers</li>
          <li>SMS Gateways</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 24, borderColor: 'var(--danger-300)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--danger-600)' }}>Danger Zone</h3>
        <p className="muted">Irreversible actions - proceed with caution</p>
        <button className="btn btn-danger" style={{ marginTop: 16 }}>
          Delete Account
        </button>
      </div>
    </div>
  )
}
