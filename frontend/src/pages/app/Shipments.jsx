export default function Shipments() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Shipments</h2>
        <div className="form-row">
          <input className="input" placeholder="Track # or Order #" />
          <input className="input" placeholder="Carrier" />
          <input className="input" placeholder="Status" />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div className="muted">TRK-90{i}2</div>
            <div>Order PO-1002{i}</div>
            <div>Carrier: FleetX</div>
            <div>Status: <span className={i%2?'badge warn':'badge success'}>{i%2?'Delayed':'In Transit'}</span></div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <select className="input" defaultValue="update">
                <option value="update" disabled>Update status…</option>
                <option>Label Created</option>
                <option>In Transit</option>
                <option>Out for Delivery</option>
                <option>Delivered</option>
                <option>Delayed</option>
              </select>
              <button className="btn btn-outline" type="button">Apply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}