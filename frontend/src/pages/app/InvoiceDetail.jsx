import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch } from '../../lib/api'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/api/invoices/${id}`)
      setInvoice(res?.data)
    } catch (e) {
      setError(e.message || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleStatusUpdate = async (newStatus, paymentData = {}) => {
    try {
      setUpdating(true)

      if (newStatus === 'paid') {
        await apiPatch(`/api/invoices/${id}/mark-paid`, paymentData)
      } else {
        await apiPatch(`/api/invoices/${id}/status`, { status: newStatus })
      }

      await load()
      setShowPaymentForm(false)
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  function getStatusBadgeClass(invoice) {
    if (invoice.is_overdue) return 'badge danger'
    switch (invoice.status) {
      case 'paid': return 'badge success'
      case 'pending': return 'badge warn'
      case 'overdue': return 'badge danger'
      case 'cancelled': return 'badge'
      default: return 'badge'
    }
  }

  function getStatusText(invoice) {
    if (invoice.is_overdue && invoice.status === 'pending') {
      return `Overdue (${invoice.days_overdue} days)`
    }
    return invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
  }

  if (loading) return <div className="card" style={{ padding: 16 }}>Loading…</div>
  if (error) return <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>
  if (!invoice) return null

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Invoice {invoice.invoice_number}</h2>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginTop: 16 }}>
          <div>
            <div className="label">Customer</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{invoice.customer}</div>
            {invoice.customer_email && (
              <div className="muted" style={{ fontSize: '14px' }}>{invoice.customer_email}</div>
            )}
          </div>
          <div>
            <div className="label">Amount</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
              {invoice.formatted_amount}
            </div>
          </div>
          <div>
            <div className="label">Status</div>
            <div>
              <span className={getStatusBadgeClass(invoice)} style={{ fontSize: '14px' }}>
                {getStatusText(invoice)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginTop: 16 }}>
          <div>
            <div className="label">Invoice Date</div>
            <div>{new Date(invoice.invoice_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="label">Due Date</div>
            <div style={{
              color: invoice.is_overdue ? 'var(--danger-600)' : 'inherit',
              fontWeight: invoice.is_overdue ? 'bold' : 'normal'
            }}>
              {new Date(invoice.due_date).toLocaleDateString()}
              {invoice.is_overdue && (
                <div className="muted" style={{ fontSize: '12px', color: 'var(--danger-600)' }}>
                  {invoice.days_overdue} days overdue
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="label">Type</div>
            <div style={{ textTransform: 'capitalize' }}>{invoice.invoice_type}</div>
          </div>
        </div>

        {invoice.payment_date && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16, marginTop: 16 }}>
            <div>
              <div className="label">Payment Date</div>
              <div>{new Date(invoice.payment_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="label">Payment Method</div>
              <div>{invoice.payment_method || 'Not specified'}</div>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div style={{ marginTop: 16 }}>
            <div className="label">Notes</div>
            <div style={{
              padding: 12,
              background: 'var(--gray-50)',
              borderRadius: 8,
              marginTop: 4
            }}>
              {invoice.notes}
            </div>
          </div>
        )}
      </div>

      {/* Related Information */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        {invoice.tracking_number && (
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Shipment Details</h3>
            <div className="grid" style={{ gap: 8 }}>
              <div>
                <div className="label">Tracking Number</div>
                <div style={{ fontFamily: 'monospace', fontSize: '16px' }}>
                  {invoice.tracking_number}
                </div>
              </div>
              {invoice.receiver_name && (
                <div>
                  <div className="label">Receiver</div>
                  <div>{invoice.receiver_name}</div>
                </div>
              )}
              {invoice.receiver_address && (
                <div>
                  <div className="label">Delivery Address</div>
                  <div className="muted" style={{ fontSize: '14px' }}>
                    {invoice.receiver_address}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {invoice.order_details && invoice.order_details.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Order Items</h3>
            <div className="grid" style={{ gap: 8 }}>
              {invoice.order_details.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 8,
                  background: 'var(--gray-50)',
                  borderRadius: 4
                }}>
                  <span>Product {item.product_id}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {invoice.status === 'pending' && !showPaymentForm && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Actions</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-success"
              onClick={() => setShowPaymentForm(true)}
              disabled={updating}
            >
              Mark as Paid
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={updating}
            >
              Cancel Invoice
            </button>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && (
        <PaymentForm
          onSubmit={handleStatusUpdate}
          onCancel={() => setShowPaymentForm(false)}
          updating={updating}
        />
      )}

      {/* Invoice Summary */}
      <div className="card" style={{
        padding: 16,
        background: invoice.status === 'paid' ? 'var(--success-50)' :
                   invoice.is_overdue ? 'var(--danger-50)' : 'var(--warning-50)',
        border: `1px solid ${
          invoice.status === 'paid' ? 'var(--success-200)' :
          invoice.is_overdue ? 'var(--danger-200)' : 'var(--warning-200)'
        }`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{
              margin: 0,
              color: invoice.status === 'paid' ? 'var(--success-800)' :
                     invoice.is_overdue ? 'var(--danger-800)' : 'var(--warning-800)'
            }}>
              {invoice.status === 'paid' ? '✅ Payment Received' :
               invoice.is_overdue ? '⚠️ Payment Overdue' : '💳 Payment Pending'}
            </h3>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: invoice.status === 'paid' ? 'var(--success-700)' :
                     invoice.is_overdue ? 'var(--danger-700)' : 'var(--warning-700)',
              marginTop: 8
            }}>
              {invoice.formatted_amount}
            </div>
          </div>
          {invoice.status === 'paid' && (
            <div style={{ textAlign: 'right' }}>
              <div className="label">Paid On</div>
              <div>{new Date(invoice.payment_date).toLocaleDateString()}</div>
              {invoice.payment_method && (
                <div className="muted">via {invoice.payment_method}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PaymentForm({ onSubmit, onCancel, updating }) {
  const [paymentData, setPaymentData] = useState({
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit('paid', paymentData)
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Record Payment</h3>
      <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
        <div className="form-row">
          <label>
            <div className="label">Payment Method *</div>
            <select
              className="input"
              value={paymentData.payment_method}
              onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
              required
            >
              <option value="Cash">Cash</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="GCash">GCash</option>
              <option value="PayPal">PayPal</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label>
            <div className="label">Payment Date *</div>
            <input
              type="date"
              className="input"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
              required
            />
          </label>
        </div>

        <label>
          <div className="label">Notes (Optional)</div>
          <textarea
            className="input"
            placeholder="Payment reference, transaction ID, etc."
            value={paymentData.notes}
            onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
            rows="3"
          />
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-success"
            disabled={updating}
          >
            {updating ? 'Recording Payment...' : 'Record Payment'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={updating}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}