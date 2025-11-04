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
    <div className="grid" style={{ gap: 24 }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              👥 Team Management
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
              Manage users, roles, and permissions
            </p>
          </div>
          <button
            onClick={openAddModal}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'white',
              color: '#7c3aed',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            + Add Team Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ position: 'relative' }}>
        <select
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            maxWidth: '300px',
            borderRadius: '12px',
            border: '2px solid var(--gray-200)',
            fontSize: '15px',
            padding: '14px',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8b5cf6'
            e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--gray-200)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="all">Filter by Role: All</option>
          <option value="admin">Admin</option>
          <option value="booking_manager">Booking Manager</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      {/* Table Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>

        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>Loading team members...</div>
        ) : users.length === 0 ? (
          <div style={{
            padding: '60px 32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div className="muted" style={{ fontSize: '16px', fontWeight: '500' }}>No team members found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderBottom: '2px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <th style={{
                    padding: '18px 24px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#8b5cf6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>Username</th>
                  <th style={{
                    padding: '18px 24px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#8b5cf6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>Email</th>
                  <th style={{
                    padding: '18px 24px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#8b5cf6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>Role</th>
                  <th style={{
                    padding: '18px 24px',
                    textAlign: 'right',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#8b5cf6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease',
                      background: 'transparent'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td style={{
                      padding: '18px 24px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: 'white'
                    }}>{user.username}</td>
                    <td style={{
                      padding: '18px 24px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>{user.email}</td>
                    <td style={{ padding: '18px 24px' }}>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {user.role_label}
                      </span>
                    </td>
                    <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => openEditModal(user)}
                        style={{
                          marginRight: 8,
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.borderColor = '#8b5cf6'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleDelete(user.id, user.username)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.borderColor = '#ef4444'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Roles Card */}
      <div className="card" style={{ borderRadius: '16px' }}>
        <h3 style={{
          marginTop: 0,
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: '700'
        }}>Available Roles</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          {roles.map((role) => (
            <div
              key={role.value}
              style={{
                padding: '16px',
                background: 'var(--surface-50)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--surface-100)'
                e.currentTarget.style.borderColor = 'var(--border-dark)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--surface-50)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                fontWeight: '700',
                marginBottom: '6px',
                fontSize: '15px'
              }}>{role.label}</div>
              <div className="muted" style={{
                fontSize: '14px',
                lineHeight: '1.5'
              }}>{role.description}</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{
          marginTop: '20px',
          marginBottom: 0,
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
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
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              marginTop: 0,
              marginBottom: '24px',
              fontSize: '24px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {editingUser ? '✏️ Edit Team Member' : '➕ Add Team Member'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid var(--border)',
                    transition: 'all 0.3s ease',
                    background: 'var(--surface-50)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid var(--border)',
                    transition: 'all 0.3s ease',
                    background: 'var(--surface-50)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Password {editingUser && <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'none' }}>(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid var(--border)',
                    transition: 'all 0.3s ease',
                    background: 'var(--surface-50)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid var(--border)',
                    transition: 'all 0.3s ease',
                    background: 'var(--surface-50)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 28 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {editingUser ? '✓ Update' : '✓ Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
