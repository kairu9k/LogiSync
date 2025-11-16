import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import { can } from '../../lib/permissions'

export default function Schedules() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    schedule_name: '',
    start_time: '',
    end_time: '',
    route_details: ''
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  async function loadSchedules() {
    try {
      const res = await apiGet('/api/schedules')
      setSchedules(res?.data || [])
    } catch (e) {
      console.error('Failed to load schedules:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredSchedules = schedules.filter(s =>
    s.schedule_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.route_details?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      schedule_name: '',
      start_time: '',
      end_time: '',
      route_details: ''
    })
    setShowModal(true)
  }

  const openEditModal = (schedule) => {
    setEditingId(schedule.id)
    // Convert datetime to local format for input
    const startTime = new Date(schedule.start_time).toISOString().slice(0, 16)
    const endTime = new Date(schedule.end_time).toISOString().slice(0, 16)

    setFormData({
      schedule_name: schedule.schedule_name,
      start_time: startTime,
      end_time: endTime,
      route_details: schedule.route_details || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingId) {
        await apiPatch(`/api/schedules/${editingId}`, formData)
      } else {
        await apiPost('/api/schedules', formData)
      }

      setShowModal(false)
      await loadSchedules()
    } catch (err) {
      console.error('Schedule save error:', err)
      alert(err.message || 'Failed to save schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule? This will fail if the schedule is assigned to any vehicles.')) return

    try {
      await apiDelete(`/api/schedules/${id}`)
      await loadSchedules()
    } catch (err) {
      alert(err.message || 'Failed to delete schedule')
    }
  }

  const calculateDuration = (start, end) => {
    const diff = new Date(end) - new Date(start)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: 'var(--gray-500)'
      }}>
        Loading schedules...
      </div>
    )
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
              📅 Schedule Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Manage delivery schedules and route timelines
            </p>
          </div>
          {can.manageShipments() && (
            <button
              className="btn btn-primary"
              onClick={openCreateModal}
              style={{
                background: 'white',
                color: '#3b82f6',
                border: 'none',
                padding: '12px 24px',
                fontSize: '15px',
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
              ➕ Add Schedule
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
            placeholder="Search by schedule name or route..."
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

      {/* Modern Card Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {filteredSchedules.length === 0 ? (
          <div style={{
            padding: '80px 32px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)' }}>No schedules found.</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your search or add a new schedule.</div>
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
                  }}>Schedule Name</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Start Time</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>End Time</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Duration</th>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Route Details</th>
                  {can.manageShipments() && (
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
                {filteredSchedules.map((schedule, index) => (
                  <tr
                    key={schedule.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td style={{
                      padding: '20px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      fontSize: '15px'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        📍 {schedule.schedule_name}
                      </span>
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '600' }}>
                          {new Date(schedule.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🕐 {new Date(schedule.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '600' }}>
                          {new Date(schedule.end_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🕐 {new Date(schedule.end_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}>
                        ⏱️ {calculateDuration(schedule.start_time, schedule.end_time)}
                      </span>
                    </td>
                    <td style={{
                      padding: '20px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      maxWidth: '250px'
                    }}>
                      {schedule.route_details ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          🛣️ {schedule.route_details}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>N/A</span>
                      )}
                    </td>
                    {can.manageShipments() && (
                      <td style={{
                        padding: '20px',
                        textAlign: 'right',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end'
                      }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => openEditModal(schedule)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
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
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(schedule.id)}
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
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
                          🗑️ Delete
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
                {editingId ? '✏️ Edit Schedule' : '➕ Add New Schedule'}
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
                  Schedule Name *
                </div>
                <input
                  className="input"
                  value={formData.schedule_name}
                  onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                  placeholder="e.g. Davao-Cebu Route"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Start Time *
                  </div>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '14px'
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
                    End Time *
                  </div>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    min={formData.start_time || new Date().toISOString().slice(0, 16)}
                    required
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </label>
              </div>

              <label>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Route Details
                </div>
                <textarea
                  className="input"
                  value={formData.route_details}
                  onChange={(e) => setFormData({ ...formData, route_details: e.target.value })}
                  placeholder="e.g. Main highway route via Surigao"
                  rows={3}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    color: 'white',
                    fontSize: '15px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
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
                  {submitting ? '⏳ Saving...' : editingId ? '✓ Update Schedule' : '✓ Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
