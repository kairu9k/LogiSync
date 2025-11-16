import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices, markInvoiceAsPaid, updateInvoiceStatus, apiPatch } from '../../lib/api'

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
      const res = await getInvoices(params)
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
        await markInvoiceAsPaid(invoiceId, {
          payment_method: paymentData.method || 'Cash',
          payment_date: paymentData.date || new Date().toISOString().split('T')[0],
          notes: paymentData.notes || ''
        })
      } else {
        await updateInvoiceStatus(invoiceId, { status: newStatus })
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
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 60px;
            color: #1f2937;
            line-height: 1.6;
            font-size: 16px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 50px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 30px;
        }
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }
        .company-info {
            text-align: left;
        }
        .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
        }
        .company-tagline {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0 0 0;
        }
        .invoice-header-right {
            text-align: right;
        }
        .invoice-title {
            font-size: 36px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
        }
        .invoice-number-display {
            font-size: 18px;
            color: #6b7280;
            margin-top: 5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin: 40px 0;
        }
        .info-section h3 {
            margin: 0 0 20px 0;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            font-size: 20px;
        }
        .info-row {
            margin: 12px 0;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
        }
        .label {
            font-weight: 600;
            color: #6b7280;
            min-width: 120px;
        }
        .value {
            color: #1f2937;
            font-weight: 500;
            text-align: right;
        }
        .amount-section {
            text-align: center;
            margin: 50px 0;
            padding: 40px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #2563eb;
            border-radius: 12px;
        }
        .amount-label {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .amount {
            font-size: 48px;
            font-weight: bold;
            color: #2563eb;
            margin: 10px 0;
        }
        .status {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
        }
        .status.paid { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.overdue { background: #fee2e2; color: #991b1b; }
        .footer {
            margin-top: 80px;
            padding-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 2px solid #e5e7eb;
        }
        .overdue-warning {
            background: #fee2e2;
            color: #991b1b;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            border: 2px solid #dc2626;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="/logo_for_logisync.png" alt="LogiSync Logo" class="logo">
            <div class="company-info">
                <div class="company-name">LogiSync</div>
                <div class="company-tagline">Logistics Management System</div>
            </div>
        </div>
        <div class="invoice-header-right">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number-display">${invoice.invoice_number}</div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-section">
            <h3>Invoice Details</h3>
            <div class="info-row">
                <span class="label">Invoice Date:</span>
                <span class="value">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="label">Due Date:</span>
                <span class="value">${new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="label">Invoice Type:</span>
                <span class="value">${invoice.invoice_type}</span>
            </div>
            ${invoice.tracking_number ? `
            <div class="info-row">
                <span class="label">Tracking #:</span>
                <span class="value">${invoice.tracking_number}</span>
            </div>` : ''}
        </div>

        <div class="info-section">
            <h3>Customer Information</h3>
            <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${invoice.customer}</span>
            </div>
            ${invoice.customer_email ? `
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${invoice.customer_email}</span>
            </div>` : `
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value" style="color: #9ca3af; font-style: italic;">Not provided</span>
            </div>`}
        </div>
    </div>

    ${invoice.is_overdue ? `
    <div class="overdue-warning">
        ⚠️ PAYMENT OVERDUE - ${invoice.days_overdue} DAYS LATE
    </div>
    ` : ''}

    <div class="amount-section">
        <div class="amount-label">TOTAL AMOUNT DUE</div>
        <div class="amount">${invoice.formatted_amount}</div>
        <div style="margin-top: 15px;">
            <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span>
        </div>
    </div>

    ${invoice.payment_date ? `
    <div class="info-grid">
        <div class="info-section">
            <h3>Payment Information</h3>
            <div class="info-row">
                <span class="label">Payment Date:</span>
                <span class="value">${new Date(invoice.payment_date).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="label">Payment Method:</span>
                <span class="value">${invoice.payment_method || 'Not specified'}</span>
            </div>
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
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              💰 Invoice Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Track payments and manage billing
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-outline"
              onClick={() => fetchInvoices({ q, status })}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              className="btn btn-outline"
              onClick={updateOverdueStatuses}
              style={{
                background: 'white',
                color: '#8b5cf6',
                border: 'none',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              📊 Update Overdue
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding Balance Alert */}
      {summary && summary.total_unpaid > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <h3 style={{ marginTop: 0, color: '#f59e0b', fontSize: '20px', marginBottom: '12px' }}>
            ⚠️ Outstanding Balance
          </h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
            ₱{(summary.total_unpaid / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
            Total unpaid amount across all pending and overdue invoices
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: 'var(--gray-400)'
          }}>🔍</span>
          <input
            className="input"
            placeholder="Search invoices or customers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              paddingLeft: '48px',
              width: '100%',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              fontSize: '15px',
              padding: '14px 14px 14px 48px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="any">Status: Any</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Stats Overview */}
      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '8px' }}>
              {summary.total || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Total Invoices</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {summary.pending || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Pending</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
              {summary.paid || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Paid</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
              {summary.overdue || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Overdue</div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Loading invoices…
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '20px',
                opacity: invoice.status === 'paid' ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (invoice.status !== 'paid') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                }
              }}
              onMouseOut={(e) => {
                if (invoice.status !== 'paid') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
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
              <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                {invoice.invoice_number}
              </div>
              <div style={{ fontWeight: 'bold', margin: '8px 0', fontSize: '16px', color: 'rgba(255, 255, 255, 0.95)' }}>
                👤 {invoice.customer}
              </div>

              <div style={{ margin: '12px 0', fontSize: '24px', fontWeight: 'bold', color: invoice.status === 'paid' ? '#10b981' : '#a78bfa' }}>
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
                <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                  📦 Tracking: {invoice.tracking_number}
                </div>
              )}

              <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                📅 Due: {new Date(invoice.due_date).toLocaleDateString()}
                {invoice.is_overdue && (
                  <span style={{ color: '#ef4444', marginLeft: 4 }}>
                    ⚠️
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                📊 Type: {invoice.invoice_type}
              </div>

              {invoice.payment_date && (
                <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                  ✓ Paid: {new Date(invoice.payment_date).toLocaleDateString()}
                  {invoice.payment_method && ` via ${invoice.payment_method}`}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                {/* Customer Contact Info for Collections */}
                {(invoice.is_overdue || invoice.status === 'pending') && (
                  <div style={{
                    marginBottom: 12,
                    padding: '12px',
                    background: invoice.is_overdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${invoice.is_overdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}>
                    <div style={{ fontSize: '12px', marginBottom: 6, fontWeight: '600', color: invoice.is_overdue ? '#ef4444' : '#f59e0b' }}>
                      {invoice.is_overdue ? '🚨 Collection Required' : '💰 Payment Pending'}
                    </div>
                    {invoice.customer_email && (
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        📧 {invoice.customer_email}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => generateInvoicePDF(invoice)}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      zIndex: 2,
                      position: 'relative',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px',
                      padding: '8px',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                    }}
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
                      style={{
                        flex: 1,
                        minWidth: '80px',
                        zIndex: 2,
                        position: 'relative',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        padding: '8px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {updating === invoice.id ? 'Processing...' : '✓ Mark Paid'}
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
                      style={{
                        flex: 1,
                        minWidth: '80px',
                        zIndex: 2,
                        position: 'relative',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        padding: '8px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      📞 Follow Up
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {invoices.length === 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '60px 32px',
              gridColumn: '1 / -1',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: 20 }}>💰</div>
              <h3 style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '20px' }}>No invoices found</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>Invoices will appear here when shipments are delivered.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}