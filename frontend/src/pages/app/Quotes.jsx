import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { getCurrentUser, can } from '../../lib/permissions'
import Toast from '../../components/Toast'

function formatMoney(cents) { return `₱${(cents/100).toFixed(2)}` }

export default function Quotes() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const currentUser = getCurrentUser()

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('any')

  // Calculator state
  const [customer, setCustomer] = useState('')
  const [weight, setWeight] = useState('')
  const [L, setL] = useState('')
  const [W, setW] = useState('')
  const [H, setH] = useState('')
  const [items, setItems] = useState('')
  const [deliveryZone, setDeliveryZone] = useState('within_city')
  const [packageType, setPackageType] = useState('')
  const [showPackageTypeDropdown, setShowPackageTypeDropdown] = useState(false)
  const [calc, setCalc] = useState({ amount_cents: 0, expiry_date: '' })

  // Edit inline state
  const [editingQuoteId, setEditingQuoteId] = useState(null)
  const [editData, setEditData] = useState({})
  const [updating, setUpdating] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState(null)

  const dims = useMemo(() => ({ L: Number(L)||0, W: Number(W)||0, H: Number(H)||0 }), [L,W,H])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/quotes')
      setList((res?.data || []).filter(q => q.status !== 'rejected'))
    } catch (e) {
      setError(e.message || 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  // Filter quotes based on search and status
  const filteredList = useMemo(() => {
    let filtered = list

    // Apply status filter
    if (statusFilter !== 'any') {
      filtered = filtered.filter(q => q.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(q =>
        q.customer?.toLowerCase().includes(query) ||
        q.created_by?.toLowerCase().includes(query) ||
        String(q.id).includes(query)
      )
    }

    return filtered
  }, [list, searchQuery, statusFilter])

  async function recompute() {
    try {
      const res = await apiPost('/api/quotes/calculate', {
        weight: Number(weight)||0,
        L: dims.L, W: dims.W, H: dims.H,
        items: Number(items)||0,
        delivery_zone: deliveryZone,
      })
      setCalc(res)
    } catch {}
  }

  function startEditing(quote) {
    const dims = typeof quote.dimensions === 'string' ? JSON.parse(quote.dimensions) : quote.dimensions
    setEditingQuoteId(quote.id)
    setEditData({
      weight: String(quote.weight || 0),
      L: String(dims?.L || 0),
      W: String(dims?.W || 0),
      H: String(dims?.H || 0),
      items: String(quote.items || 0),
      delivery_zone: quote.delivery_zone || 'within_city',
      package_type: quote.package_type || 'Standard',
      price: String((quote.estimated_cost / 100).toFixed(2))
    })
  }

  function cancelEditing() {
    setEditingQuoteId(null)
    setEditData({})
  }

  async function saveEdit(quoteId) {
    setUpdating(true)
    try {
      await apiPatch(`/api/quotes/${quoteId}`, {
        weight: Number(editData.weight) || 0,
        L: Number(editData.L) || 0,
        W: Number(editData.W) || 0,
        H: Number(editData.H) || 0,
        items: Number(editData.items) || 0,
        delivery_zone: editData.delivery_zone,
        package_type: editData.package_type || 'Standard',
        estimated_cost: Math.round(Number(editData.price) * 100), // Convert to cents
      })
      setEditingQuoteId(null)
      setEditData({})
      await refresh()
    } catch (e) {
      alert(e.message || 'Failed to update quote')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { recompute() }, [weight, L, W, H, items, deliveryZone])

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes priceUpdate {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder, select::placeholder {
          opacity: 0.4 !important;
        }
        input::-webkit-input-placeholder, select::-webkit-input-placeholder {
          opacity: 0.4 !important;
        }
        input::-moz-placeholder, select::-moz-placeholder {
          opacity: 0.4 !important;
        }
      `}</style>
      <div className="grid" style={{ gap: 24 }}>
      {can.manageQuotes() && (
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
              💰 Quote Calculator
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
              Calculate shipping costs and generate quotes instantly
            </p>
          </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '20px', alignItems: 'stretch' }}>
          {/* Column 1: Customer & Package Details */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
          >
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginBottom: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 Package Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: '500' }}>Customer Name</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>👤</span>
                  <input
                    className="input"
                    value={customer}
                    onChange={(e)=>setCustomer(e.target.value)}
                    placeholder="Enter customer name"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      fontSize: '14px',
                      padding: '11px 14px 11px 42px',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'white'
                      e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: '500' }}>Weight (kg)</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>⚖️</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={weight}
                    onChange={(e)=>setWeight(e.target.value)}
                    placeholder="0"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      fontSize: '14px',
                      padding: '11px 40px 11px 42px',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'white'
                      e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>kg</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: '500' }}>Total Items Inside</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>📦</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={items}
                    onChange={(e)=>setItems(e.target.value)}
                    placeholder="0"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      fontSize: '14px',
                      padding: '11px 40px 11px 42px',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'white'
                      e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Dimensions & Zone & Create Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              transition: 'all 0.3s ease',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📏 Dimensions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={L}
                  onChange={(e)=>setL(e.target.value)}
                  placeholder="L (cm)"
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '13px',
                    padding: '11px 10px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'white'
                    e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={W}
                  onChange={(e)=>setW(e.target.value)}
                  placeholder="W (cm)"
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '13px',
                    padding: '11px 10px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'white'
                    e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={H}
                  onChange={(e)=>setH(e.target.value)}
                  placeholder="H (cm)"
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '13px',
                    padding: '11px 10px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'white'
                    e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', margin: '4px 0' }}>Length × Width × Height</div>
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>Delivery Zone</div>
                <select
                  className="input"
                  value={deliveryZone}
                  onChange={(e)=>setDeliveryZone(e.target.value)}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '14px',
                    padding: '11px 14px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'white'
                    e.target.style.background = 'rgba(255, 255, 255, 0.22)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <option value="within_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🏙️ Within City (0-20 km)</option>
                  <option value="nearby_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🚗 Nearby City (20-50 km)</option>
                  <option value="far_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🛣️ Far City (50-100 km)</option>
                  <option value="regional" style={{background: 'var(--bg)', color: 'var(--text)'}}>🗺️ Regional (100+ km)</option>
                </select>
              </div>
              </div>
            </div>

            {/* Package Type Combo Box */}
            <div style={{ position: 'relative' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '10px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📦 Special Handling Notes *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  placeholder="Standard"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 16px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                    // Close dropdown after a small delay to allow click events
                    setTimeout(() => setShowPackageTypeDropdown(false), 200)
                  }}
                />
                {/* Dropdown Arrow Button */}
                <button
                  type="button"
                  onClick={() => setShowPackageTypeDropdown(!showPackageTypeDropdown)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'white'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <span style={{ fontSize: '12px', transform: showPackageTypeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
                </button>

                {/* Dropdown Menu */}
                {showPackageTypeDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#1f2937',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}>
                    {['Standard', 'Fragile', 'Hazardous', 'Keep Upright'].map((option) => (
                      <div
                        key={option}
                        onClick={() => {
                          setPackageType(option)
                          setShowPackageTypeDropdown(false)
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          background: packageType === option ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = packageType === option ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Estimated Cost */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '40px 20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            height: '100%'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)'
            }}></div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>💵 Estimated Cost</div>
            <div
              key={calc.amount_cents}
              style={{
                fontSize: '36px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px',
                lineHeight: '1',
                textShadow: '0 2px 10px rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                animation: 'priceUpdate 0.5s ease-out'
              }}
            >
              {formatMoney(calc.amount_cents || 0)}
            </div>
            <div style={{
              width: '60px',
              height: '1px',
              background: 'rgba(255, 255, 255, 0.3)',
              margin: '8px auto'
            }}></div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '20px' }}>Valid until {calc.expiry_date || '—'}</div>

            {/* Create Quote Button - Moved Here */}
            <button
              disabled={creating}
              onClick={async()=>{
                // Validation
                if (!customer.trim()) {
                  setToast({ message: 'Please enter customer name', type: 'warning' })
                  return
                }
                if (Number(weight) <= 0) {
                  setToast({ message: 'Please enter a valid weight', type: 'warning' })
                  return
                }
                if (Number(L) <= 0 || Number(W) <= 0 || Number(H) <= 0) {
                  setToast({ message: 'Please enter all dimensions (L, W, H)', type: 'warning' })
                  return
                }
                if (Number(items) <= 0) {
                  setToast({ message: 'Please enter total items inside', type: 'warning' })
                  return
                }
                if (!packageType.trim()) {
                  setToast({ message: 'Please enter or select special handling notes', type: 'warning' })
                  return
                }

                setCreating(true)
                try {
                  const finalPackageType = packageType.trim() || 'Standard'
                  const res = await apiPost('/api/quotes', {
                    customer,
                    weight: Number(weight)||0,
                    L: dims.L, W: dims.W, H: dims.H,
                    items: Number(items)||0,
                    delivery_zone: deliveryZone,
                    package_type: finalPackageType,
                    created_by_user_id: currentUser?.user_id || currentUser?.id,
                  })
                  await refresh()
                  // Clear form
                  setCustomer('')
                  setWeight('')
                  setItems('')
                  setDeliveryZone('within_city')
                  setPackageType('')
                  setL('')
                  setW('')
                  setH('')
                  setToast({ message: 'Quote created successfully!', type: 'success' })
                } catch (e) {
                  setToast({ message: e.message || 'Failed to create quote', type: 'error' })
                } finally {
                  setCreating(false)
                }
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.6 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%'
              }}
              onMouseOver={(e) => {
                if (!creating) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                if (!creating) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                }
              }}
            >
              {creating ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '16px' }}>✨</span>
                  <span>Create Quote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Quotes Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            📋 All Quotes
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
            View and manage customer shipping quotes
          </p>
        </div>
      </div>

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
            placeholder="Search quotes (customer, ID, prepared by)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="any">Status: Any</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="expired">Expired</option>
        </select>
      </div>

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
          Loading quotes…
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {filteredList.map(q => {
            const converted = !!q.order_id || q.converted === true;
            const getStatusColors = (status) => {
              switch(status) {
                case 'approved':
                  return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
                case 'rejected':
                  return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
                case 'expired':
                  return { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' }
                default:
                  return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
              }
            }

            const statusColors = getStatusColors(q.status)

            const isEditing = editingQuoteId === q.id

            return (
              <div
                key={q.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '14px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: converted ? 0.7 : 1,
                  border: isEditing ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!converted && !isEditing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!converted && !isEditing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                {/* Edit Icon - Top Right */}
                {!converted && q.status === 'pending' && can.manageQuotes() && (
                  <button
                    onClick={() => isEditing ? cancelEditing() : startEditing(q)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: isEditing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      zIndex: 10
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = isEditing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                      e.currentTarget.style.transform = 'scale(1.1)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = isEditing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {isEditing ? '✕' : '✏️'}
                  </button>
                )}

                {converted && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-25deg)',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    opacity: 0.3,
                    pointerEvents: 'none',
                    zIndex: 1,
                    userSelect: 'none',
                    textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}>
                    ✓ CONVERTED
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '3px',
                    fontWeight: '500'
                  }}>
                    Quote ID
                  </div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#3b82f6',
                    fontFamily: 'monospace'
                  }}>
                    Q-{String(q.id).padStart(5,'0')}
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.95)',
                    marginBottom: '3px'
                  }}>
                    {q.customer}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    Prepared by: {q.created_by || 'Unknown'}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Weight (kg)</div>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.weight}
                        onChange={(e) => setEditData({...editData, weight: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>{q.weight}kg</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Items</div>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.items}
                        onChange={(e) => setEditData({...editData, items: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>📦 {q.items || 0}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Zone</div>
                    {isEditing ? (
                      <select
                        value={editData.delivery_zone}
                        onChange={(e) => setEditData({...editData, delivery_zone: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="within_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🏙️ Within</option>
                        <option value="nearby_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🚗 Nearby</option>
                        <option value="far_city" style={{background: 'var(--bg)', color: 'var(--text)'}}>🛣️ Far</option>
                        <option value="regional" style={{background: 'var(--bg)', color: 'var(--text)'}}>🗺️ Regional</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {q.delivery_zone === 'within_city' && '🏙️ Within'}
                        {q.delivery_zone === 'nearby_city' && '🚗 Nearby'}
                        {q.delivery_zone === 'far_city' && '🛣️ Far'}
                        {q.delivery_zone === 'regional' && '🗺️ Regional'}
                        {!q.delivery_zone && '—'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Type */}
                <div style={{
                  marginBottom: '10px',
                  padding: '8px 10px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>📦 Package Type</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.package_type}
                      onChange={(e) => setEditData({...editData, package_type: e.target.value})}
                      placeholder="Standard"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.5)',
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {q.package_type || 'Standard'}
                    </div>
                  )}
                </div>

                {/* Dimensions - Only show in edit mode */}
                {isEditing && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '6px',
                    marginBottom: '10px',
                    padding: '10px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Length (cm)</div>
                      <input
                        type="number"
                        min="0"
                        value={editData.L}
                        onChange={(e) => setEditData({...editData, L: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Width (cm)</div>
                      <input
                        type="number"
                        min="0"
                        value={editData.W}
                        onChange={(e) => setEditData({...editData, W: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Height (cm)</div>
                      <input
                        type="number"
                        min="0"
                        value={editData.H}
                        onChange={(e) => setEditData({...editData, H: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '3px' }}>{q.cost_label || 'Estimated Cost'}</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.price}
                        onChange={(e) => setEditData({...editData, price: e.target.value})}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.5)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '700'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{formatMoney(q.estimated_cost)}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: statusColors.bg,
                    color: statusColors.color,
                    textTransform: 'uppercase'
                  }}>
                    {q.status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Expires: {q.expiry_date}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(q.id)}
                        disabled={updating}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: updating ? 'not-allowed' : 'pointer',
                          opacity: updating ? 0.6 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {updating ? '⏳ Saving...' : '✓ Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={updating}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          background: 'transparent',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: updating ? 'not-allowed' : 'pointer',
                          opacity: updating ? 0.6 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : converted ? (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✓ Order Created
                    </span>
                  ) : q.status === 'approved' ? (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✓ Approved
                    </span>
                  ) : (
                    <>
                      {can.manageQuotes() ? (
                        <>
                          <button
                            onClick={async()=>{
                              try {
                                // Approve quote and automatically create order
                                await apiPatch(`/api/quotes/${q.id}/status`, { status: 'approved' })
                                const res = await apiPost(`/api/quotes/${q.id}/convert-to-order`, {})
                                const orderId = res?.order_id
                                await refresh()
                                if (orderId) {
                                  setToast({
                                    message: `Quote approved! Order #${orderId} created successfully.`,
                                    type: 'success'
                                  })
                                } else {
                                  setToast({
                                    message: 'Quote approved successfully!',
                                    type: 'success'
                                  })
                                }
                              } catch(e){
                                setToast({ message: e.message || 'Failed to approve quote', type: 'error' })
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'rejected' }); setList(prev => prev.filter(item => item.id !== q.id)) } catch(e){ alert(e.message) }}}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: '2px solid rgba(239, 68, 68, 0.5)',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                              e.currentTarget.style.borderColor = '#ef4444'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                            }}
                          >
                            ✗ Reject
                          </button>
                        </>
                      ) : (
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6'
                        }}>
                          ⏳ Pending Approval
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {filteredList.length===0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📋</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                No quotes found
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Try adjusting your search or filter criteria
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Toast Notification */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
        duration={3000}
      />
    )}
    </>
  )
}
