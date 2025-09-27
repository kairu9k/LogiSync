import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPatch } from '../../lib/api'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('any')
  const [updating, setUpdating] = useState(null)
  const navigate = useNavigate()

  async function fetchInvoices(params = {}) {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/invoices' +
        (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''))
      // Sort invoices: put paid invoices last
      const sortedData = (res?.data || []).sort((a, b) => {
        if (a.status === 'paid' && b.status !== 'paid') return 1
        if (a.status !== 'paid' && b.status === 'paid') return -1
        return 0
      })
      setInvoices(sortedData)
      setSummary(res?.summary || {})
    } catch (e) {
      setError(e.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices({ q, status })
  }, [q, status])

  const handleStatusUpdate = async (invoiceId, newStatus, paymentData = {}) => {
    try {
      setUpdating(invoiceId)

      if (newStatus === 'paid') {
        await apiPatch(`/api/invoices/${invoiceId}/mark-paid`, {
          payment_method: paymentData.method || 'Cash',
          payment_date: paymentData.date || new Date().toISOString().split('T')[0],
          notes: paymentData.notes || ''
        })
      } else {
        await apiPatch(`/api/invoices/${invoiceId}/status`, { status: newStatus })
      }

      await fetchInvoices({ q, status })
    } catch (e) {
      alert(e.message || 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const updateOverdueStatuses = async () => {
    try {
      setLoading(true)
      const response = await apiPatch('/api/invoices/update-overdue')
      await fetchInvoices({ q, status })

      // Show success message with update count
      if (response?.updated_count > 0) {
        alert(`Successfully updated ${response.updated_count} invoice${response.updated_count > 1 ? 's' : ''} to overdue status.`)
      } else {
        alert('All invoice statuses are up to date.')
      }
    } catch (e) {
      alert(e.message || 'Failed to update overdue statuses')
    }
  }

  const generateInvoicePDF = (invoice) => {
    // Create PDF content
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .invoice-title { font-size: 20px; margin-top: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
        .info-section h3 { margin: 0 0 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .info-row { margin: 8px 0; }
        .label { font-weight: bold; color: #6b7280; }
        .amount-section { text-align: center; margin: 40px 0; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; }
        .amount { font-size: 32px; font-weight: bold; color: #059669; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: bold; }
        .status.paid { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.overdue { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 12px; }
        .overdue-warning { background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">LogiSync</div>
        <div class="invoice-title">INVOICE</div>
    </div>

    <div class="info-grid">
        <div class="info-section">
            <h3>Invoice Details</h3>
            <div class="info-row"><span class="label">Invoice #:</span> ${invoice.invoice_number}</div>
            <div class="info-row"><span class="label">Date:</span> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
            <div class="info-row"><span class="label">Due Date:</span> ${new Date(invoice.due_date).toLocaleDateString()}</div>
            <div class="info-row"><span class="label">Type:</span> ${invoice.invoice_type}</div>
            ${invoice.tracking_number ? `<div class="info-row"><span class="label">Tracking #:</span> ${invoice.tracking_number}</div>` : ''}
        </div>

        <div class="info-section">
            <h3>Customer Information</h3>
            <div class="info-row"><span class="label">Customer:</span> ${invoice.customer}</div>
            ${invoice.customer_email ? `<div class="info-row"><span class="label">Email:</span> ${invoice.customer_email}</div>` : ''}
        </div>
    </div>

    ${invoice.is_overdue ? `
    <div class="overdue-warning">
        ⚠️ PAYMENT OVERDUE - ${invoice.days_overdue} DAYS LATE
    </div>
    ` : ''}

    <div class="amount-section">
        <div class="label">Total Amount</div>
        <div class="amount">${invoice.formatted_amount}</div>
        <div style="margin-top: 15px;">
            <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span>
        </div>
    </div>

    ${invoice.payment_date ? `
    <div class="info-grid">
        <div class="info-section">
            <h3>Payment Information</h3>
            <div class="info-row"><span class="label">Payment Date:</span> ${new Date(invoice.payment_date).toLocaleDateString()}</div>
            <div class="info-row"><span class="label">Payment Method:</span> ${invoice.payment_method || 'Not specified'}</div>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} | LogiSync Invoice System</p>
        ${!invoice.payment_date ? '<p><strong>Please remit payment by the due date to avoid late fees.</strong></p>' : ''}
    </div>
</body>
</html>
    `

    // Create and download PDF
    const blob = new Blob([pdfContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice_${invoice.invoice_number}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Also open in new window for immediate viewing/printing
    const newWindow = window.open('', '_blank')
    newWindow.document.write(pdfContent)
    newWindow.document.close()
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

  return (
    <div className="grid" style={{ gap: 16 }}>
      {summary && summary.total_unpaid > 0 && (
        <div className="card" style={{
          padding: 16,
          background: 'var(--warning-50)',
          border: '1px solid var(--warning-200)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--warning-800)' }}>
            Outstanding Balance
          </h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-700)' }}>
            ₱{(summary.total_unpaid / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="muted">Total unpaid amount across all pending and overdue invoices</div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Invoices</h2>
          <button className="btn btn-outline" onClick={updateOverdueStatuses}>
            Update Overdue
          </button>
        </div>

        <div className="form-row">
          <input
            className="input"
            placeholder="Search invoices or customers"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="any">Status: Any</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {summary && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 16 }}>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                {summary.total || 0}
              </div>
              <div className="muted">Total Invoices</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-600)' }}>
                {summary.pending || 0}
              </div>
              <div className="muted">Pending</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-600)' }}>
                {summary.paid || 0}
              </div>
              <div className="muted">Paid</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger-600)' }}>
                {summary.overdue || 0}
              </div>
              <div className="muted">Overdue</div>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="card" style={{ padding: 16 }}>Loading invoices…</div>}
      {error && <div className="card" style={{ padding: 16, color: 'var(--danger-600)' }}>{error}</div>}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="card"
              style={{
                padding: 16,
                opacity: invoice.status === 'paid' ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {invoice.status === 'paid' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-25deg)',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'var(--success-300)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  userSelect: 'none'
                }}>
                  ✓ PAID
                </div>
              )}
              <div className="muted" style={{ fontFamily: 'monospace' }}>
                {invoice.invoice_number}
              </div>
              <div style={{ fontWeight: 'bold', margin: '8px 0' }}>
                {invoice.customer}
              </div>

              <div style={{ margin: '8px 0', fontSize: '20px', fontWeight: 'bold', color: invoice.status === 'paid' ? 'var(--success-600)' : 'var(--primary-600)' }}>
                {invoice.formatted_amount}
              </div>

              <div style={{ margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={getStatusBadgeClass(invoice)}>
                  {getStatusText(invoice)}
                </span>
                {invoice.is_overdue && invoice.days_overdue > 0 && (
                  <span className="muted" style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>
                    {invoice.days_overdue} days late
                  </span>
                )}
              </div>

              {invoice.tracking_number && (
                <div className="muted" style={{ fontSize: '0.875rem', margin: '4px 0' }}>
                  📦 Tracking: {invoice.tracking_number}
                </div>
              )}

              <div className="muted" style={{ fontSize: '0.875rem', margin: '4px 0' }}>
                📅 Due: {new Date(invoice.due_date).toLocaleDateString()}
                {invoice.is_overdue && (
                  <span style={{ color: 'var(--danger-600)', marginLeft: 4 }}>
                    ⚠️
                  </span>
                )}
              </div>

              <div className="muted" style={{ fontSize: '0.875rem', margin: '4px 0' }}>
                📊 Type: {invoice.invoice_type}
              </div>

              {invoice.payment_date && (
                <div className="muted" style={{ fontSize: '0.875rem', margin: '4px 0' }}>
                  Paid: {new Date(invoice.payment_date).toLocaleDateString()}
                  {invoice.payment_method && ` via ${invoice.payment_method}`}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                {/* Customer Contact Info for Collections */}
                {(invoice.is_overdue || invoice.status === 'pending') && (
                  <div style={{
                    marginBottom: 8,
                    padding: 8,
                    backgroundColor: invoice.is_overdue ? 'var(--danger-50)' : 'var(--warning-50)',
                    borderRadius: 4,
                    border: `1px solid ${invoice.is_overdue ? 'var(--danger-200)' : 'var(--warning-200)'}`
                  }}>
                    <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                      {invoice.is_overdue ? '🚨 Collection Required' : '💰 Payment Pending'}
                    </div>
                    {invoice.customer_email && (
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        📧 {invoice.customer_email}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => generateInvoicePDF(invoice)}
                    style={{ flex: 1, minWidth: '80px', zIndex: 2, position: 'relative' }}
                  >
                    📄 PDF
                  </button>

                  {invoice.status === 'pending' && (
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        const method = prompt('Payment method:', 'Cash')
                        if (method) {
                          handleStatusUpdate(invoice.id, 'paid', { method })
                        }
                      }}
                      disabled={updating === invoice.id}
                      style={{ flex: 1, minWidth: '80px', zIndex: 2, position: 'relative' }}
                    >
                      {updating === invoice.id ? 'Processing...' : 'Mark Paid'}
                    </button>
                  )}

                  {invoice.is_overdue && (
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        const contact = invoice.customer_email ?
                          `Email: ${invoice.customer_email}` :
                          'Customer contact info not available'
                        alert(`Follow up required for ${invoice.invoice_number}\nCustomer: ${invoice.customer}\n${contact}\nAmount: ${invoice.formatted_amount}\nDays overdue: ${invoice.days_overdue}`)
                      }}
                      style={{ flex: 1, minWidth: '80px', zIndex: 2, position: 'relative' }}
                    >
                      Follow Up
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {invoices.length === 0 && (
            <div className="card" style={{ padding: 16, gridColumn: '1 / -1', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>📄</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No invoices found</h3>
              <p className="muted">Invoices will appear here when shipments are delivered.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}