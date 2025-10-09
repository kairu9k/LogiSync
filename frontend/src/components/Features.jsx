export default function Features() {
  return (
    <section id="features" className="section container">
      <h2 className="section-title">Everything you need to manage deliveries</h2>
      <div className="grid features">
        <article className="card">
          <div className="icon">📍</div>
          <h3>Real-Time GPS Tracking</h3>
          <p>Track drivers live with GPS location updates every 20 seconds. View routes on interactive maps.</p>
        </article>
        <article className="card">
          <div className="icon">🚛</div>
          <h3>Smart Capacity Management</h3>
          <p>Monitor vehicle load in real-time. Prevent overloading with automatic weight-based capacity alerts.</p>
        </article>
        <article className="card">
          <div className="icon">💰</div>
          <h3>Custom Pricing Formula</h3>
          <p>Set your own rates for distance, weight, fuel, and insurance. Different pricing for standard vs remote areas.</p>
        </article>
        <article className="card">
          <div className="icon">📱</div>
          <h3>Mobile Driver Portal</h3>
          <p>Drivers update shipment status on-the-go. View deliveries, contact info, and package details.</p>
        </article>
        <article className="card">
          <div className="icon">📦</div>
          <h3>Warehouse Management</h3>
          <p>Track inventory across multiple warehouses. Assign items to orders with real-time stock updates.</p>
        </article>
        <article className="card">
          <div className="icon">📊</div>
          <h3>Quote & Order System</h3>
          <p>Generate instant quotes with automatic cost calculation. Convert quotes to orders seamlessly.</p>
        </article>
      </div>
    </section>
  )
}
