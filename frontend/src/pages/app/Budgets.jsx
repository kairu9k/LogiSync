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
      total_budget: ''
    })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingId(budget.id)
    setFormData({
      budget_name: budget.budget_name,
      total_budget: budget.total_budget
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Get current date and date 1 year from now as defaults
      const today = new Date().toISOString().split('T')[0]
      const oneYearLater = new Date()
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      const endDate = oneYearLater.toISOString().split('T')[0]

      const payload = {
        ...formData,
        total_budget: parseInt(formData.total_budget),
        start_date: today,
        end_date: endDate
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
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
                color: '#3b82f6',
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
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-200)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Budget Cards Container */}
      <div style={{
        borderRadius: '16px',
        overflow: 'hidden'
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            padding: '8px'
          }}>
            {filteredBudgets.map((budget) => (
              <div
                key={budget.id}
                style={{
                  background: 'var(--surface)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.15)'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {/* Budget Icon */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '120px',
                  opacity: '0.05',
                  transform: 'rotate(-15deg)'
                }}>💰</div>

                {/* Budget Name */}
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--text)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>💼</span>
                  {budget.budget_name}
                </div>

                {/* Total Budget */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600'
                  }}>Total Budget</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: '#3b82f6',
                    fontFamily: 'monospace'
                  }}>
                    ₱{budget.total_budget.toLocaleString()}
                  </div>
                </div>

                {/* Actions */}
                {can.manageWarehouses() && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(budget)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.5)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
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
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              margin: 'auto',
              width: '100%',
              maxWidth: '550px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '32px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '28px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '22px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {editingId ? '✏️ Edit Budget' : '➕ Add New Budget'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              <label>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Budget Name *
                </div>
                <input
                  className="input"
                  value={formData.budget_name}
                  onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                  placeholder="e.g. Q1 2025 Transportation Budget"
                  required
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    color: 'white',
                    fontSize: '15px'
                  }}
                />
              </label>

              <label>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Budget (₱) *
                </div>
                <input
                  type="number"
                  className="input"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="e.g. 500000"
                  min="0"
                  required
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    color: 'white',
                    fontSize: '15px'
                  }}
                />
              </label>

              <div style={{
                display: 'flex',
                gap: 12,
                marginTop: 8,
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: submitting
                      ? 'rgba(59, 130, 246, 0.5)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.4)'
                  }}
                  onMouseOver={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)'
                    }
                  }}
                >
                  {submitting ? '⏳ Saving...' : editingId ? '✓ Update Budget' : '✓ Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
