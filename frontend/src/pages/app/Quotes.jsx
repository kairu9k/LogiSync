import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { getCurrentUser, can } from '../../lib/permissions'

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
  const [destination, setDestination] = useState('standard')
  const [weight, setWeight] = useState('0')
  const [L, setL] = useState('0')
  const [W, setW] = useState('0')
  const [H, setH] = useState('0')
  const [distance, setDistance] = useState('0')
  const [calc, setCalc] = useState({ amount_cents: 0, expiry_date: '' })

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
        distance: Number(distance)||0,
        destination,
      })
      setCalc(res)
    } catch {}
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { recompute() }, [weight, L, W, H, distance, destination])

  return (
    <div className="grid" style={{ gap: 24 }}>
      {can.manageQuotes() && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
                💰 Quote Calculator
              </h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                Calculate shipping costs and generate quotes
              </p>
            </div>
          </div>
        <div className="grid" style={{ gap: 16 }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>Customer</div>
              <input
                className="input"
                value={customer}
                onChange={(e)=>setCustomer(e.target.value)}
                placeholder="Customer name"
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>Destination Type</div>
              <select
                className="input"
                value={destination}
                onChange={(e)=>setDestination(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              >
                <option value="standard" style={{ background: '#1f2937', color: 'white' }}>Standard (Within Davao Region)</option>
                <option value="remote" style={{ background: '#1f2937', color: 'white' }}>Remote (Mindanao & Visayas)</option>
              </select>
            </label>
          </div>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>Weight (kg)</div>
              <input
                className="input"
                type="number"
                min="0"
                value={weight}
                onChange={(e)=>setWeight(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>Distance (km)</div>
              <input
                className="input"
                type="number"
                min="0"
                value={distance}
                onChange={(e)=>setDistance(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
          </div>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>L (cm)</div>
              <input
                className="input"
                type="number"
                min="0"
                value={L}
                onChange={(e)=>setL(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>W (cm)</div>
              <input
                className="input"
                type="number"
                min="0"
                value={W}
                onChange={(e)=>setW(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
            <label>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '8px', fontWeight: '600' }}>H (cm)</div>
              <input
                className="input"
                type="number"
                min="0"
                value={H}
                onChange={(e)=>setH(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '14px',
                  padding: '12px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </label>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '6px', fontWeight: '500' }}>Estimated Cost</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'white' }}>{formatMoney(calc.amount_cents || 0)}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Expires: {calc.expiry_date || '—'}</div>
            </div>
            <div>
              <button
                disabled={creating}
                onClick={async()=>{
                  // Validation
                  if (!customer.trim()) {
                    alert('Please enter customer name')
                    return
                  }
                  if (Number(weight) <= 0) {
                    alert('Please enter a valid weight')
                    return
                  }
                  if (Number(distance) <= 0) {
                    alert('Please enter a valid distance')
                    return
                  }

                  setCreating(true)
                  try {
                    const res = await apiPost('/api/quotes', {
                      customer,
                      destination,
                      weight: Number(weight)||0,
                      L: dims.L, W: dims.W, H: dims.H,
                      distance: Number(distance)||0,
                      created_by_user_id: currentUser?.user_id || currentUser?.id,
                    })
                    await refresh()
                    // Clear form
                    setCustomer('')
                    setWeight('0')
                    setDistance('0')
                    setL('0')
                    setW('0')
                    setH('0')
                    alert('Quote created successfully!')
                  } catch (e) {
                    alert(e.message || 'Failed to create quote')
                  } finally {
                    setCreating(false)
                  }
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: creating ? 'rgba(255, 255, 255, 0.3)' : 'white',
                  color: '#4f46e5',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: creating ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => {
                  if (!creating) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!creating) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                {creating ? '⏳ Creating...' : '✓ Create Quote'}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Quotes Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
              e.target.style.borderColor = '#6366f1'
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
            e.target.style.borderColor = '#6366f1'
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
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!converted) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!converted) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
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
                    color: '#6366f1',
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Weight</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>{q.weight}kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '3px' }}>Distance</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>{q.distance}km</div>
                  </div>
                </div>

                <div style={{
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '3px' }}>Estimated Cost</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#6366f1' }}>{formatMoney(q.estimated_cost)}</div>
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
                  {converted ? (
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
                      ✓ Converted to Order
                    </span>
                  ) : q.status === 'approved' ? (
                    <>
                      {can.manageQuotes() && (
                        <button
                          onClick={async()=>{ try { const res = await apiPost(`/api/quotes/${q.id}/convert-to-order`, {}); const id = res?.order_id; if (id) navigate(`/app/orders/${id}`); else await refresh(); } catch(e){ alert(e.message) }}}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          🔄 Convert to Order
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {can.manageQuotes() ? (
                        <>
                          <button
                            onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'approved' }); await refresh() } catch(e){ alert(e.message) }}}
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
  )
}
