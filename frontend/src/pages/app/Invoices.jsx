export default function Invoices() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget)
    const payload = {
      customer: form.get('customer') || '',
      amount: parseFloat(form.get('amount') || '0') || 0,
      due_date: form.get('due_date'),
      ref: form.get('ref') || '',
      order_id: 1,
    }
    try {
      const { apiPost } = await import('../../lib/api')
      await apiPost('/api/invoices', payload)
      alert('Invoice generated')
    } catch (err) {
      alert(err.message || 'Failed to generate invoice')
    }
  }
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Generate Invoice</h2>
        <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
          <div className="form-row">
            <label>
              <div className="label">Customer</div>
<input name="customer" className="input" placeholder="Customer name" required />
            </label>
            <label>
              <div className="label">Amount</div>
<input name="amount" className="input" type="number" min="0" step="0.01" placeholder="0.00" required />
            </label>
          </div>
          <div className="form-row">
            <label>
              <div className="label">Due date</div>
<input name="due_date" className="input" type="date" required />
            </label>
            <label>
              <div className="label">PO / Ref</div>
<input name="ref" className="input" placeholder="PO-1234" />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">Generate</button>
            <button className="btn btn-outline" type="button">Download PDF</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Billing</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div className="muted">INV-90{i}1</div>
              <div>Acme Inc.</div>
              <div>$1,{i}50 • <span className={i%2? 'badge warn':'badge success'}>{i%2? 'Overdue':'Paid'}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}