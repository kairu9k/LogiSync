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
    return <div>Loading schedules...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Schedule Management</h2>
        {can.manageShipments() && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Schedule
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="input"
          placeholder="Search by schedule name or route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filteredSchedules.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-500)' }}>
            No schedules found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Schedule Name</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Start Time</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>End Time</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Route Details</th>
                  {can.manageShipments() && (
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{schedule.schedule_name}</td>
                    <td style={{ padding: 12 }}>
                      {new Date(schedule.start_time).toLocaleString()}
                    </td>
                    <td style={{ padding: 12 }}>
                      {new Date(schedule.end_time).toLocaleString()}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span className="badge">{calculateDuration(schedule.start_time, schedule.end_time)}</span>
                    </td>
                    <td style={{ padding: 12, color: 'var(--gray-600)' }}>
                      {schedule.route_details || 'N/A'}
                    </td>
                    {can.manageShipments() && (
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button className="btn btn-sm" onClick={() => openEditModal(schedule)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(schedule.id)}
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
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Schedule' : 'Add New Schedule'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <label>
                <div className="label">Schedule Name *</div>
                <input
                  className="input"
                  value={formData.schedule_name}
                  onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                  placeholder="e.g. Davao-Cebu Route"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                  <div className="label">Start Time *</div>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    style={{ borderRadius: '8px' }}
                  />
                </label>
                <label>
                  <div className="label">End Time *</div>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    style={{ borderRadius: '8px' }}
                  />
                </label>
              </div>

              <label>
                <div className="label">Route Details</div>
                <textarea
                  className="input"
                  value={formData.route_details}
                  onChange={(e) => setFormData({ ...formData, route_details: e.target.value })}
                  placeholder="e.g. Main highway route via Surigao"
                  rows={3}
                  style={{ resize: 'vertical', borderRadius: '8px' }}
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
