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
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'
  const [selectedInvoice, setSelectedInvoice] = useState(null) // For detail modal
  const [showPaymentModal, setShowPaymentModal] = useState(null) // For payment form
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [amountRange, setAmountRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState('date_desc') // date_desc, date_asc, amount_desc, amount_asc
  const [selectedInvoices, setSelectedInvoices] = useState([]) // For bulk actions
  const navigate = useNavigate()

  async function fetchInvoices(params = {}) {
    setLoading(true)
    setError('')
    try {
      const res = await getInvoices(params)
      let data = res?.data || []

      // Apply client-side filters
      if (dateRange.start) {
        data = data.filter(inv => new Date(inv.created_at) >= new Date(dateRange.start))
      }
      if (dateRange.end) {
        data = data.filter(inv => new Date(inv.created_at) <= new Date(dateRange.end))
      }
      if (amountRange.min) {
        data = data.filter(inv => inv.amount >= parseFloat(amountRange.min) * 100)
      }
      if (amountRange.max) {
        data = data.filter(inv => inv.amount <= parseFloat(amountRange.max) * 100)
      }

      // Apply sorting
      data = data.sort((a, b) => {
        switch (sortBy) {
          case 'date_desc':
            return new Date(b.created_at) - new Date(a.created_at)
          case 'date_asc':
            return new Date(a.created_at) - new Date(b.created_at)
          case 'amount_desc':
            return b.amount - a.amount
          case 'amount_asc':
            return a.amount - b.amount
          case 'customer':
            return (a.customer || '').localeCompare(b.customer || '')
          case 'overdue':
            return (b.days_overdue || 0) - (a.days_overdue || 0)
          default:
            return 0
        }
      })

      setInvoices(data)
      setSummary(res?.summary || {})
    } catch (e) {
      setError(e.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices({ q, status })
  }, [q, status, dateRange, amountRange, sortBy])

  const handleStatusUpdate = async (invoiceId, newStatus, paymentData = {}) => {
    try {
      setUpdating(invoiceId)

      if (newStatus === 'paid') {
        await markInvoiceAsPaid(invoiceId, {
          payment_method: paymentData.method || 'Cash',
          payment_date: paymentData.date || new Date().toISOString().split('T')[0],
          notes: paymentData.notes || '',
          amount_paid: paymentData.amount_paid || null
        })
      } else {
        await updateInvoiceStatus(invoiceId, { status: newStatus })
      }

      await fetchInvoices({ q, status })
      setShowPaymentModal(null)
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

      if (response?.updated_count > 0) {
        alert(`Successfully updated ${response.updated_count} invoice${response.updated_count > 1 ? 's' : ''} to overdue status.`)
      } else {
        alert('All invoice statuses are up to date.')
      }
    } catch (e) {
      alert(e.message || 'Failed to update overdue statuses')
    }
  }

  const handleBulkMarkPaid = async () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices first')
      return
    }

    if (!confirm(`Mark ${selectedInvoices.length} invoice(s) as paid?`)) return

    try {
      setLoading(true)
      for (const invoiceId of selectedInvoices) {
        await markInvoiceAsPaid(invoiceId, {
          payment_method: 'Cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: 'Bulk payment'
        })
      }
      setSelectedInvoices([])
      await fetchInvoices({ q, status })
      alert(`Successfully marked ${selectedInvoices.length} invoice(s) as paid`)
    } catch (e) {
      alert('Failed to process bulk payment: ' + e.message)
    }
  }

  const handleBulkDownloadPDF = () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices first')
      return
    }

    selectedInvoices.forEach(invoiceId => {
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (invoice) {
        generateInvoicePDF(invoice)
      }
    })
  }

  const toggleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id))
    }
  }

  const generateInvoicePDF = (invoice) => {
    // Keep existing PDF generation logic
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
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .company-name { font-size: 32px; font-weight: bold; color: #2563eb; }
        .invoice-title { font-size: 36px; font-weight: bold; }
        .amount-section {
            text-align: center;
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #2563eb;
            border-radius: 12px;
        }
        .amount { font-size: 48px; font-weight: bold; color: #2563eb; }
        .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
        .label { font-weight: 600; color: #6b7280; }
        .value { color: #1f2937; font-weight: 500; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company-name">LogiSync</div>
            <div style="color: #6b7280;">Logistics Management System</div>
        </div>
        <div style="text-align: right;">
            <div class="invoice-title">INVOICE</div>
            <div style="color: #6b7280;">${invoice.invoice_number}</div>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0;">
        <div>
            <h3>Bill To:</h3>
            <div><strong>${invoice.customer}</strong></div>
            ${invoice.customer_email ? `<div>${invoice.customer_email}</div>` : ''}
        </div>
        <div style="text-align: right;">
            <div class="info-row">
                <span class="label">Invoice Date:</span>
                <span class="value">${new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="label">Due Date:</span>
                <span class="value">${new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
                <span class="label">Status:</span>
                <span class="value" style="color: ${invoice.status === 'paid' ? '#10b981' : '#f59e0b'}; font-weight: bold;">
                    ${invoice.status.toUpperCase()}
                </span>
            </div>
        </div>
    </div>

    ${invoice.tracking_number ? `
    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #2563eb;">
        <strong>Tracking Number:</strong> ${invoice.tracking_number}
    </div>
    ` : ''}

    <div class="amount-section">
        <div style="font-size: 18px; color: #6b7280; margin-bottom: 10px;">Total Amount</div>
        <div class="amount">${invoice.formatted_amount}</div>
        <div style="margin-top: 10px; padding: 8px 20px; background: ${invoice.status === 'paid' ? '#d1fae5' : '#fef3c7'};
             color: ${invoice.status === 'paid' ? '#065f46' : '#92400e'}; border-radius: 20px; display: inline-block; font-weight: bold;">
            ${invoice.status.toUpperCase()}
        </div>
    </div>

    ${invoice.payment_date ? `
    <div style="margin: 20px 0;">
        <h3>Payment Information</h3>
        <div class="info-row">
            <span class="label">Payment Date:</span>
            <span class="value">${new Date(invoice.payment_date).toLocaleDateString()}</span>
        </div>
        ${invoice.payment_method ? `
        <div class="info-row">
            <span class="label">Payment Method:</span>
            <span class="value">${invoice.payment_method}</span>
        </div>
        ` : ''}
    </div>
    ` : ''}

    <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Thank you for your business!</p>
        <p>LogiSync - Logistics Management System</p>
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 30px;
                font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer;">
            Print Invoice
        </button>
    </div>
</body>
</html>
    `

    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow.document.write(pdfContent)
    printWindow.document.close()
  }

  const getStatusBadgeClass = (invoice) => {
    if (invoice.status === 'paid') return 'badge success'
    if (invoice.is_overdue) return 'badge danger'
    if (invoice.status === 'pending') return 'badge warn'
    if (invoice.status === 'cancelled') return 'badge'
    return 'badge info'
  }

  const getStatusText = (invoice) => {
    if (invoice.is_overdue && invoice.status !== 'paid') return 'Overdue'
    return invoice.status
  }

  const clearFilters = () => {
    setQ('')
    setStatus('any')
    setDateRange({ start: '', end: '' })
    setAmountRange({ min: '', max: '' })
    setSortBy('date_desc')
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              📄 Invoice Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Track payments, manage billing, and generate reports
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
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
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            >
              📊 Update Overdue
            </button>
            {selectedInvoices.length > 0 && (
              <>
                <button
                  onClick={handleBulkMarkPaid}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Mark {selectedInvoices.length} Paid
                </button>
                <button
                  onClick={handleBulkDownloadPDF}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  📄 Download {selectedInvoices.length} PDFs
                </button>
              </>
            )}
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

      {/* Stats Overview */}
      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
          <StatsCard icon="📊" value={summary.total || 0} label="Total Invoices" color="#a78bfa" />
          <StatsCard icon="⏳" value={summary.pending || 0} label="Pending" color="#f59e0b" />
          <StatsCard icon="✓" value={summary.paid || 0} label="Paid" color="#10b981" />
          <StatsCard icon="⚠️" value={summary.overdue || 0} label="Overdue" color="#ef4444" />
        </div>
      )}

      {/* Filters and View Toggle */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>🔍 Filters & Search</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={clearFilters}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
            <button
              onClick={() => setViewMode('card')}
              style={{
                background: viewMode === 'card' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🃏 Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              📋 Table
            </button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
            <input
              className="input"
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%', fontSize: '14px', padding: '10px 10px 10px 40px' }}
            />
          </div>

          {/* Status Filter */}
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ fontSize: '14px', padding: '10px' }}
          >
            <option value="any">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Sort By */}
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ fontSize: '14px', padding: '10px' }}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="customer">Customer A-Z</option>
            <option value="overdue">Most Overdue</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            className="input"
            placeholder="Start Date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            style={{ fontSize: '14px', padding: '10px' }}
          />
          <input
            type="date"
            className="input"
            placeholder="End Date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            style={{ fontSize: '14px', padding: '10px' }}
          />

          {/* Amount Range */}
          <input
            type="number"
            className="input"
            placeholder="Min Amount"
            value={amountRange.min}
            onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
            style={{ fontSize: '14px', padding: '10px' }}
          />
          <input
            type="number"
            className="input"
            placeholder="Max Amount"
            value={amountRange.max}
            onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
            style={{ fontSize: '14px', padding: '10px' }}
          />
        </div>
      </div>

      {loading && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          Loading invoices…
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <div style={{ fontSize: '18px', marginBottom: '8px', color: 'white' }}>No invoices found</div>
          <div style={{ fontSize: '14px' }}>Try adjusting your filters</div>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        viewMode === 'card' ? (
          <CardView
            invoices={invoices}
            selectedInvoices={selectedInvoices}
            toggleSelectInvoice={toggleSelectInvoice}
            setSelectedInvoice={setSelectedInvoice}
            setShowPaymentModal={setShowPaymentModal}
            generateInvoicePDF={generateInvoicePDF}
            getStatusBadgeClass={getStatusBadgeClass}
            getStatusText={getStatusText}
            updating={updating}
          />
        ) : (
          <TableView
            invoices={invoices}
            selectedInvoices={selectedInvoices}
            toggleSelectInvoice={toggleSelectInvoice}
            toggleSelectAll={toggleSelectAll}
            setSelectedInvoice={setSelectedInvoice}
            setShowPaymentModal={setShowPaymentModal}
            generateInvoicePDF={generateInvoicePDF}
            getStatusBadgeClass={getStatusBadgeClass}
            getStatusText={getStatusText}
            updating={updating}
          />
        )
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={(invoice) => {
            setSelectedInvoice(null)
            setShowPaymentModal(invoice)
          }}
          generatePDF={generateInvoicePDF}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={showPaymentModal}
          onClose={() => setShowPaymentModal(null)}
          onSubmit={handleStatusUpdate}
          updating={updating}
        />
      )}
    </div>
  )
}

// Stats Card Component
function StatsCard({ icon, value, label, color }) {
  return (
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
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>{label}</div>
    </div>
  )
}

// Card View Component
function CardView({ invoices, selectedInvoices, toggleSelectInvoice, setSelectedInvoice, setShowPaymentModal, generateInvoicePDF, getStatusBadgeClass, getStatusText, updating }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '20px',
            opacity: invoice.status === 'paid' ? 0.7 : 1,
            position: 'relative',
            overflow: 'hidden',
            border: selectedInvoices.includes(invoice.id) ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedInvoice(invoice)}
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
          {/* Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              toggleSelectInvoice(invoice.id)
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              background: selectedInvoices.includes(invoice.id) ? '#3b82f6' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            {selectedInvoices.includes(invoice.id) && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
          </div>

          {invoice.status === 'paid' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#10b981',
              pointerEvents: 'none',
              zIndex: 1
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
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                {invoice.days_overdue} days late
              </span>
            )}
          </div>

          <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
            📅 Due: {new Date(invoice.due_date).toLocaleDateString()}
          </div>

          {invoice.tracking_number && (
            <div style={{ fontSize: '13px', margin: '8px 0', color: 'rgba(255, 255, 255, 0.7)' }}>
              📦 {invoice.tracking_number}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => generateInvoicePDF(invoice)}
              style={{
                flex: 1,
                minWidth: '80px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px',
                cursor: 'pointer'
              }}
            >
              📄 PDF
            </button>

            {invoice.status === 'pending' && (
              <button
                onClick={() => setShowPaymentModal(invoice)}
                disabled={updating === invoice.id}
                style={{
                  flex: 1,
                  minWidth: '80px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  padding: '8px',
                  cursor: 'pointer'
                }}
              >
                {updating === invoice.id ? 'Processing...' : '✓ Mark Paid'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Table View Component
function TableView({ invoices, selectedInvoices, toggleSelectInvoice, toggleSelectAll, setSelectedInvoice, setShowPaymentModal, generateInvoicePDF, getStatusBadgeClass, getStatusText, updating }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <input
                  type="checkbox"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Invoice #</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Customer</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Due Date</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  background: selectedInvoices.includes(invoice.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  opacity: invoice.status === 'paid' ? 0.6 : 1,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => setSelectedInvoice(invoice)}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = selectedInvoices.includes(invoice.id) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = selectedInvoices.includes(invoice.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                }}
              >
                <td style={{ padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={() => toggleSelectInvoice(invoice.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'monospace', fontSize: '13px' }}>
                  {invoice.invoice_number}
                </td>
                <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' }}>
                  {invoice.customer}
                </td>
                <td style={{ padding: '16px', color: invoice.status === 'paid' ? '#10b981' : '#a78bfa', fontWeight: '700', fontSize: '16px' }}>
                  {invoice.formatted_amount}
                </td>
                <td style={{ padding: '16px' }}>
                  <span className={getStatusBadgeClass(invoice)} style={{ fontSize: '12px' }}>
                    {getStatusText(invoice)}
                  </span>
                  {invoice.is_overdue && invoice.days_overdue > 0 && (
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      {invoice.days_overdue} days late
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => generateInvoicePDF(invoice)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                      title="Download PDF"
                    >
                      📄
                    </button>
                    {invoice.status === 'pending' && (
                      <button
                        onClick={() => setShowPaymentModal(invoice)}
                        disabled={updating === invoice.id}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                        title="Mark as Paid"
                      >
                        {updating === invoice.id ? '...' : '✓'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Invoice Detail Modal Component
function InvoiceDetailModal({ invoice, onClose, onMarkPaid, generatePDF }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(31, 41, 55, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
              Invoice Details
            </h3>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px', fontFamily: 'monospace' }}>
              {invoice.invoice_number}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Invoice Info */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <InfoRow label="Customer" value={invoice.customer} icon="👤" />
          {invoice.customer_email && <InfoRow label="Email" value={invoice.customer_email} icon="📧" />}
          <InfoRow label="Amount" value={invoice.formatted_amount} icon="💰" valueColor={invoice.status === 'paid' ? '#10b981' : '#a78bfa'} />
          <InfoRow label="Invoice Type" value={invoice.invoice_type} icon="📊" />
          <InfoRow label="Created" value={new Date(invoice.created_at).toLocaleDateString()} icon="📅" />
          <InfoRow label="Due Date" value={new Date(invoice.due_date).toLocaleDateString()} icon="⏰" />

          {invoice.tracking_number && <InfoRow label="Tracking" value={invoice.tracking_number} icon="📦" />}

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '16px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Status</span>
            <span className={invoice.status === 'paid' ? 'badge success' : invoice.is_overdue ? 'badge danger' : 'badge warn'}>
              {invoice.is_overdue && invoice.status !== 'paid' ? 'Overdue' : invoice.status}
            </span>
          </div>

          {invoice.is_overdue && invoice.days_overdue > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              ⚠️ {invoice.days_overdue} days overdue
            </div>
          )}

          {invoice.payment_date && (
            <>
              <InfoRow label="Payment Date" value={new Date(invoice.payment_date).toLocaleDateString()} icon="✓" valueColor="#10b981" />
              {invoice.payment_method && <InfoRow label="Payment Method" value={invoice.payment_method} icon="💳" />}
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => generatePDF(invoice)}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            📄 Download PDF
          </button>
          {invoice.status === 'pending' && (
            <button
              onClick={() => onMarkPaid(invoice)}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✓ Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon, valueColor }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      padding: '12px 16px',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span>{icon}</span>}
        {label}
      </span>
      <span style={{ color: valueColor || 'white', fontWeight: '600', fontSize: '14px' }}>
        {value}
      </span>
    </div>
  )
}

// Payment Modal Component
function PaymentModal({ invoice, onClose, onSubmit, updating }) {
  const [paymentData, setPaymentData] = useState({
    method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    amount_paid: invoice.amount / 100
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(invoice.id, 'paid', paymentData)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(31, 41, 55, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px'
        }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white' }}>
            💳 Record Payment
          </h3>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '4px' }}>
            {invoice.invoice_number}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#10b981', marginBottom: '10px' }}>
                Payment Method *
              </label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white'
                }}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="PayMaya">PayMaya</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#10b981', marginBottom: '10px' }}>
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#10b981', marginBottom: '10px' }}>
                Amount Paid (₱)
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentData.amount_paid}
                onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white'
                }}
              />
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '6px' }}>
                Invoice amount: {invoice.formatted_amount}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#10b981', marginBottom: '10px' }}>
                Notes / Reference Number
              </label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Optional notes or transaction reference..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating === invoice.id}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: updating === invoice.id ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              {updating === invoice.id ? '⏳ Processing...' : '✓ Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
