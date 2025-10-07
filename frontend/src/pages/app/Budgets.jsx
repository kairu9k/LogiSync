import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import { can } from '../../lib/permissions'

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    budget_name: '',
    start_date: '',
    end_date: '',
    total_budget: ''
  })

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    try {
      const res = await apiGet('/api/budgets')
      setBudgets(res?.data || [])
    } catch (e) {
      console.error('Failed to load budgets:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredBudgets = budgets.filter(b =>
    b.budget_name?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      budget_name: '',
      start_date: '',
      end_date: '',
      total_budget: ''
    })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingId(budget.id)
    setFormData({
      budget_name: budget.budget_name,
      start_date: budget.start_date,
      end_date: budget.end_date,
      total_budget: budget.total_budget
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        ...formData,
        total_budget: parseInt(formData.total_budget)
      }

      if (editingId) {
        await apiPatch(`/api/budgets/${editingId}`, payload)
      } else {
        await apiPost('/api/budgets', payload)
      }

      setShowModal(false)
      await loadBudgets()
    } catch (err) {
      console.error('Budget save error:', err)
      alert(err.message || 'Failed to save budget')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget? This will fail if the budget is assigned to any vehicles.')) return

    try {
      await apiDelete(`/api/budgets/${id}`)
      await loadBudgets()
    } catch (err) {
      alert(err.message || 'Failed to delete budget')
    }
  }

  if (loading) {
    return <div>Loading budgets...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Budget Management</h2>
        {can.manageWarehouses() && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Budget
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="input"
          placeholder="Search by budget name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filteredBudgets.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-500)' }}>
            No budgets found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Budget Name</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Period</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Total Budget</th>
                  {can.manageWarehouses() && (
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget) => (
                  <tr key={budget.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: 12 }}>{budget.budget_name}</td>
                    <td style={{ padding: 12 }}>
                      {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                      ₱{budget.total_budget.toLocaleString()}
                    </td>
                    {can.manageWarehouses() && (
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button className="btn btn-sm" onClick={() => openEditModal(budget)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(budget.id)}
                          style={{ marginLeft: 8 }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowModal(false)
            }
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', margin: 'auto', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Budget' : 'Add New Budget'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <label>
                <div className="label">Budget Name *</div>
                <input
                  className="input"
                  value={formData.budget_name}
                  onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                  placeholder="e.g. Q1 2025 Transportation Budget"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div className="label">Start Date *</div>
                  <input
                    type="date"
                    className="input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <div className="label">End Date *</div>
                  <input
                    type="date"
                    className="input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                <div className="label">Total Budget (₱) *</div>
                <input
                  type="number"
                  className="input"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="e.g. 500000"
                  min="0"
                  required
                />
              </label>

              <div className="form-actions" style={{ marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
