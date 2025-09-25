export default function Dashboard() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <article className="card">
          <div className="label">Total Orders</div>
          <div className="stat">1,248</div>
        </article>
        <article className="card">
          <div className="label">Active Shipments</div>
          <div className="stat">86</div>
        </article>
        <article className="card">
          <div className="label">Quote Requests</div>
          <div className="stat">32</div>
        </article>
        <article className="card">
          <div className="label">Unpaid Invoices</div>
          <div className="stat">$12.4k</div>
        </article>
      </div>

      <div className="card" style={{ minHeight: 260 }}>
        <div className="label">Fulfillment performance (last 30 days)</div>
        <div className="skeleton" style={{ height: 180, marginTop: 12 }} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>PO-100234 • 42 items • <span className="badge info">Processing</span></li>
            <li>PO-100235 • 10 items • <span className="badge success">Fulfilled</span></li>
            <li>PO-100236 • 5 items • <span className="badge warn">Delayed</span></li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notifications</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>2 shipments delayed due to weather.</li>
            <li>New quote request from Acme Inc.</li>
            <li>Invoice INV-9041 overdue by 3 days.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}