import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'

function formatMoney(cents) { return `$${(cents/100).toFixed(2)}` }

export default function Quotes() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quote Calculator</h2>
        <div className="grid" style={{ gap: 12 }}>
          <div className="form-row">
            <label>
              <div className="label">Customer</div>
              <input className="input" value={customer} onChange={(e)=>setCustomer(e.target.value)} placeholder="Customer name" />
            </label>
            <label>
              <div className="label">Destination</div>
              <select className="input" value={destination} onChange={(e)=>setDestination(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="remote">Remote</option>
                <option value="international">International</option>
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
              <button className="btn btn-primary" onClick={async()=>{
                try {
                  const res = await apiPost('/api/quotes', {
                    customer,
                    destination,
                    weight: Number(weight)||0,
                    L: dims.L, W: dims.W, H: dims.H,
                    distance: Number(distance)||0,
                  })
                  await refresh()
                  alert('Quote created')
                } catch (e) { alert(e.message || 'Failed to create quote') }
              }}>Create Quote</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quotes</h2>
        {loading && <div className="muted" style={{ padding: 12 }}>Loading…</div>}
        {error && <div style={{ color: 'var(--danger-600)', padding: 12 }}>{error}</div>}
        {!loading && !error && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {list.map(q => {
              const converted = !!q.order_id || q.converted === true;
              return (
                <div key={q.id} className="card" style={{ padding: 16, position: 'relative', overflow: 'hidden', opacity: converted ? 0.6 : 1 }}>
                  {converted && <div className="quote-watermark">Converted</div>}
                  <div className="muted">Q-{String(q.id).padStart(5,'0')}</div>
                  <div>Customer {q.customer}</div>
                  <div>Weight {q.weight}kg • Distance {q.distance}km</div>
                  <div>Est. {formatMoney(q.estimated_cost)} • <span className={`badge ${q.status==='approved'?'success': q.status==='rejected'?'danger':'info'}`}>{q.status}</span></div>
                  <div className="muted">Expires {q.expiry_date}</div>
                  <div className="form-actions" style={{ marginTop: 8 }}>
                    {converted ? (
                      <span className="badge success">Converted</span>
                    ) : (
                      <>
                        <button className="btn" onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'approved' }); await refresh() } catch(e){ alert(e.message) }}}>Approve</button>
                        <button className="btn btn-outline" onClick={async()=>{ try { await apiPatch(`/api/quotes/${q.id}/status`, { status: 'rejected' }); setList(prev => prev.filter(item => item.id !== q.id)) } catch(e){ alert(e.message) }}}>Reject</button>
                        <button className="btn btn-primary" onClick={async()=>{ try { const res = await apiPost(`/api/quotes/${q.id}/convert-to-order`, {}); const id = res?.order_id; if (id) navigate(`/app/orders/${id}`); else await refresh(); } catch(e){ alert(e.message) }}}>Convert to Order</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            {list.length===0 && <div className="card" style={{ padding: 16 }}>No quotes yet.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
