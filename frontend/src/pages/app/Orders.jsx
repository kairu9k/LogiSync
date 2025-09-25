export default function Orders() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Orders</h2>
        <div className="form-row">
          <input className="input" placeholder="Search orders (PO, customer)" />
          <input className="input" placeholder="Status: Any" />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div className="muted">PO-1002{i}</div>
            <div>Customer {i}</div>
            <div>Items: {i*3}</div>
            <div>Status: <span className={i%3===0? 'badge success':'badge info'}>{i%3===0?'Fulfilled':'Processing'}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}