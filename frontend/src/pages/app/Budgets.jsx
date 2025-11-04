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
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(146, 64, 14, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              💰 Budgets
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Track and manage your transportation budgets
            </p>
          </div>
          {can.manageWarehouses() && (
            <button
              onClick={openCreateModal}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'white',
                color: '#92400e',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
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
              + Add Budget
            </button>
          )}
        </div>
      </div>

      {/* Search Bar with Icon */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: 'var(--gray-400)'
          }}>🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Search by budget name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              e.target.style.borderColor = '#92400e'
              e.target.style.boxShadow = '0 0 0 3px rgba(146, 64, 14, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Modern Card Table - Dark Theme */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {filteredBudgets.length === 0 ? (
          <div style={{
            padding: '80px 32px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)' }}>No budgets found.</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your search or add a new budget.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Budget Name</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Period</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'right',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Total Budget</th>
                  {can.manageWarehouses() && (
                    <th style={{
                      padding: '18px 20px',
                      textAlign: 'right',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget, index) => (
                  <tr
                    key={budget.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(146, 64, 14, 0.1)'
                      e.currentTarget.style.transform = 'scale(1.01)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    <td style={{
                      padding: '18px 20px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>{budget.budget_name}</td>
                    <td style={{
                      padding: '18px 20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                    </td>
                    <td style={{
                      padding: '18px 20px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#d97706'
                    }}>
                      ₱{budget.total_budget.toLocaleString()}
                    </td>
                    {can.manageWarehouses() && (
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => openEditModal(budget)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginRight: '8px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(146, 64, 14, 0.3)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
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
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowModal(false)
            }
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              margin: 'auto',
              width: '100%',
              maxWidth: '500px',
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <h3 style={{
              marginTop: 0,
              marginBottom: '24px',
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💰</span>
              {editingId ? 'Edit Budget' : 'Add New Budget'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
              <label>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>Budget Name *</div>
                <input
                  className="input"
                  value={formData.budget_name}
                  onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                  placeholder="e.g. Q1 2025 Transportation Budget"
                  required
                  style={{
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>Start Date *</div>
                  <input
                    type="date"
                    className="input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </label>
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>End Date *</div>
                  <input
                    type="date"
                    className="input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </label>
              </div>

              <label>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>Total Budget (₱) *</div>
                <input
                  type="number"
                  className="input"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="e.g. 500000"
                  min="0"
                  required
                  style={{
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: submitting
                      ? '#cbd5e1'
                      : 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: submitting ? 'none' : '0 4px 12px rgba(146, 64, 14, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(146, 64, 14, 0.4)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(146, 64, 14, 0.3)'
                    }
                  }}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Budget' : 'Create Budget'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'white',
                    color: '#6b7280',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: submitting ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.borderColor = '#cbd5e1'
                      e.currentTarget.style.background = '#f9fafb'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.background = 'white'
                    }
                  }}
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
