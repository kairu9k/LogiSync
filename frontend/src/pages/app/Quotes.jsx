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
    <div className="grid" style={{ gap: 16 }}>
      {can.manageQuotes() && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quote Calculator</h2>
        <div className="grid" style={{ gap: 12 }}>
          <div className="form-row">
            <label>
              <div className="label">Customer</div>
              <input className="input" value={customer} onChange={(e)=>setCustomer(e.target.value)} placeholder="Customer name" />
            </label>
            <label>
              <div className="label">Destination Type</div>
              <select className="input" value={destination} onChange={(e)=>setDestination(e.target.value)}>
                <option value="standard">Standard (Within Davao Region)</option>
                <option value="remote">Remote (Mindanao & Visayas)</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              <div className="label">Weight (kg)</div>
              <input className="input" type="number" min="0" value={weight} onChange={(e)=>setWeight(e.target.value)} />
            </label>
            <label>
              <div className="label">Distance (km)</div>
              <input className="input" type="number" min="0" value={distance} onChange={(e)=>setDistance(e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              <div className="label">L (cm)</div>
              <input className="input" type="number" min="0" value={L} onChange={(e)=>setL(e.target.value)} />
            </label>
            <label>
              <div className="label">W (cm)</div>
              <input className="input" type="number" min="0" value={W} onChange={(e)=>setW(e.target.value)} />
            </label>
            <label>
              <div className="label">H (cm)</div>
              <input className="input" type="number" min="0" value={H} onChange={(e)=>setH(e.target.value)} />
            </label>
          </div>
          <div className="form-row" style={{ alignItems: 'end' }}>
            <div>
              <div className="label">Estimated Cost</div>
              <div className="stat">{formatMoney(calc.amount_cents || 0)}</div>
              <div className="muted">Expires: {calc.expiry_date || '—'}</div>
            </div>
            <div className="form-actions" style={{ marginLeft: 'auto' }}>
              <button className="btn btn-primary" disabled={creating} onClick={async()=>{
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
              }}>{creating ? 'Creating...' : 'Create Quote'}</button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quotes</h2>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Search quotes (customer, ID, prepared by)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="any">Status: Any</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        {loading && <div className="muted" style={{ padding: 12 }}>Loading…</div>}
        {error && <div style={{ color: 'var(--danger-600)', padding: 12 }}>{error}</div>}
        {!loading && !error && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {filteredList.map(q => {
              const converted = !!q.order_id || q.converted === true;
              return (
                <div key={q.id} className="card" style={{ padding: 16, position: 'relative', overflow: 'hidden', opacity: converted ? 0.6 : 1 }}>
                  {converted && <div className="quote-watermark">Converted</div>}
                  <div className="muted">Q-{String(q.id).padStart(5,'0')}</div>
                  <div><strong>{q.customer}</strong></div>
                  <div className="muted" style={{ fontSize: '0.875rem' }}>Prepared by: {q.created_by || 'Unknown'}</div>
                  <div style={{ marginTop: 8 }}>Weight {q.weight}kg • Distance {q.distance}km</div>
                  <div>Est. {formatMoney(q.estimated_cost)} • <span className={`badge ${q.status==='approved'?'success': q.status==='rejected'?'danger':'info'}`}>{q.status}</span></div>
                  <div className="muted">Expires {q.expiry_date}</div>
                  <div className="form-actions" style={{ marginTop: 8 }}>
                    {converted ? (
                      <span className="badge success">Converted</span>
                    ) : q.status === 'approved' ? (
                      <>
                        {can.manageQuotes() && (
                          <button className="btn btn-primary" onClick={async()=>{ try { const res = await apiPost(`/api/quotes/${q.id}/convert-to-order`, {}); const id = res?.order_id; if (id) navigate(`/app/orders/${id}`); else await refresh(); } catch(e){ alert(e.message) }}}>Convert to Order</button>
                        )}
                      </>
                    ) : (
                      <>
                        {can.manageQuotes() ? (
                          <>
                            <button className="btn" onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'approved' }); await refresh() } catch(e){ alert(e.message) }}}>Approve</button>
                            <button className="btn btn-outline" onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'rejected' }); setList(prev => prev.filter(item => item.id !== q.id)) } catch(e){ alert(e.message) }}}>Reject</button>
                          </>
                        ) : (
                          <span className="badge info">Pending Approval</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredList.length===0 && <div className="card" style={{ padding: 16 }}>No quotes found.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
