import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'

export default function TeamManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'booking_manager'
  })
  const [filter, setFilter] = useState('all')

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Full system access and management' },
    { value: 'booking_manager', label: 'Booking Manager', description: 'Manage quotes and orders' },
    { value: 'warehouse_manager', label: 'Warehouse Manager', description: 'Manage warehouses and inventory' },
    { value: 'driver', label: 'Driver', description: 'View and update assigned shipments' }
  ]

  useEffect(() => {
    loadUsers()
  }, [filter])

  async function loadUsers() {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?role=${filter}` : ''
      const res = await apiGet(`/api/users${params}`)
      setUsers(res.data || [])
    } catch (e) {
      console.error('Failed to load users:', e)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingUser(null)
    setFormData({ username: '', email: '', password: '', role: 'booking_manager' })
    setShowAddModal(true)
  }

  function openEditModal(user) {
    setEditingUser(user)
    setFormData({ username: user.username, email: user.email, password: '', role: user.role })
    setShowAddModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingUser) {
        // Update existing user
        const updateData = { username: formData.username, email: formData.email, role: formData.role }
        if (formData.password) {
          updateData.password = formData.password
        }
        await apiPatch(`/api/users/${editingUser.id}`, updateData)
      } else {
        // Create new user
        await apiPost('/api/users', formData)
      }
      setShowAddModal(false)
      loadUsers()
    } catch (e) {
      console.error('Failed to save user:', e)
      alert('Failed to save user. Please check the form and try again.')
    }
  }

  async function handleDelete(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return
    try {
      await apiDelete(`/api/users/${userId}`)
      loadUsers()
    } catch (e) {
      console.error('Failed to delete user:', e)
      alert('Failed to delete user.')
    }
  }

  function getRoleBadgeClass(role) {
    const map = {
      admin: 'danger',
      booking_manager: 'info',
      warehouse_manager: 'warn',
      driver: 'success'
    }
    return map[role] || ''
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Team Management</h1>
          <p className="muted">Manage users, roles, and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Team Member
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="booking_manager">Booking Manager</option>
            <option value="warehouse_manager">Warehouse Manager</option>
            <option value="driver">Driver</option>
          </select>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : users.length === 0 ? (
          <div className="muted">No team members found</div>
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role_label}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => openEditModal(user)}
                      style={{ marginRight: 8 }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(user.id, user.username)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Available Roles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {roles.map((role) => (
            <div key={role.value} style={{ padding: 12, background: 'var(--surface-50)', borderRadius: 8 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{role.label}</div>
              <div className="muted" style={{ fontSize: '14px' }}>{role.description}</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 16, fontSize: '14px' }}>
          Note: Customers use the public tracking page on the landing site - they don't need dashboard access.
        </p>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 500, margin: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{editingUser ? 'Edit Team Member' : 'Add Team Member'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Password {editingUser && '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
