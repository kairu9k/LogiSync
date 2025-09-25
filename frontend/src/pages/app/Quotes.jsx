export default function Quotes() {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = {
      customer: form.get('customer') || '',
      origin: form.get('origin') || '',
      destination: form.get('destination') || '',
      items: form.get('items') || '',
      price: parseFloat(form.get('price') || '0') || 0,
      currency: form.get('currency') || 'USD',
      user_id: 1,
    }
    try {
      const { apiPost } = await import('../../lib/api')
      await apiPost('/api/quotes', payload)
      alert('Quote saved')
    } catch (err) {
      alert(err.message || 'Failed to save quote')
    }
  }
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create Quote</h2>
<form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
          <div className="form-row">
            <label>
              <div className="label">Customer</div>
              <input name="customer" className="input" placeholder="Customer name" required />
            </label>
            <label>
              <div className="label">Reference</div>
<input name="reference" className="input" placeholder="Optional reference" />
            </label>
          </div>
          <div className="form-row">
            <label>
<div className="label">Origin</div>
<input name="origin" className="input" placeholder="City, Country" required />
            </label>
            <label>
<div className="label">Destination</div>
              <input name="destination" className="input" placeholder="City, Country" required />
            </label>
          </div>
          <label>
            <div className="label">Items</div>
<textarea name="items" className="input" rows={3} placeholder="Describe the items" />
          </label>
          <div className="form-row">
            <label>
              <div className="label">Estimated Price</div>
<input name="price" className="input" type="number" min="0" step="0.01" placeholder="0.00" />
            </label>
            <label>
              <div className="label">Currency</div>
<input name="currency" className="input" placeholder="USD" defaultValue="USD" />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">Save Quote</button>
            <button className="btn btn-outline" type="button">Preview</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Manage Quotes</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div className="muted">Q-{9000+i}</div>
              <div>Acme Inc. → Berlin, DE</div>
              <div>Est. $1,{i}00 • <span className="badge info">Pending</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}