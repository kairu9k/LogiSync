import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Ably from 'ably'
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Get user organization_id
  const organizationId = (() => {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.user?.organization_id
      }
    } catch (e) {
      console.error('Failed to parse auth data:', e)
    }
    return null
  })()

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      setLoading(true)
      const endpoint = showHistory ? '/api/notifications' : '/api/notifications/unread'
      const res = await apiGet(endpoint)
      setNotifications(res.data || [])
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadNotifications()
  }, [showHistory])

  // Real-time updates via Ably
  useEffect(() => {
    if (!organizationId) {
      console.warn('[NotificationBell] No organization_id found, skipping Ably subscription')
      return
    }

    const ably = new Ably.Realtime({
      key: import.meta.env.VITE_ABLY_KEY,
    })

    const channelName = `public:organization.${organizationId}`
    console.log('[NotificationBell] 📡 Subscribing to channel:', channelName)
    const channel = ably.channels.get(channelName)

    // Listen for new notifications being created
    channel.subscribe('notification.created', (message) => {
      console.log('[NotificationBell] New notification received:', message.data)
      // Add new notification to the list
      setNotifications((prev) => [message.data, ...prev])
    })

    // Listen for shipment and order updates to refresh notifications
    channel.subscribe('shipment.status.updated', () => {
      console.log('[NotificationBell] Shipment updated, refreshing notifications')
      loadNotifications()
    })

    channel.subscribe('order.status.updated', () => {
      console.log('[NotificationBell] Order updated, refreshing notifications')
      loadNotifications()
    })

    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [organizationId, showHistory])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiPatch(`/api/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  // Dismiss notification
  const handleDismiss = async (notificationId, event) => {
    event.stopPropagation()
    try {
      await apiDelete(`/api/notifications/${notificationId}`)
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId))
    } catch (e) {
      console.error('Failed to dismiss notification:', e)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiPost('/api/notifications/mark-all-read')
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.notification_id)
    }
    if (notification.link) {
      navigate(notification.link)
      setIsOpen(false)
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  // Count only unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          fontSize: '24px'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-100)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--danger-500)',
              color: 'white',
              borderRadius: '50%',
              fontSize: '11px',
              fontWeight: '600',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--surface)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '400px',
            maxHeight: '540px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Notifications</h3>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {unreadCount} unread
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid var(--border)',
                  background: showHistory ? 'var(--primary-100)' : 'var(--surface)',
                  color: showHistory ? 'var(--primary-700)' : 'var(--text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {showHistory ? '📋 Showing All' : '📩 Unread Only'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ✓ Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '8px'
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {showHistory ? 'No notifications yet' : 'No unread notifications'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: notification.link ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      backgroundColor: notification.read
                        ? 'var(--surface-50)'
                        : notification.type === 'critical'
                        ? 'var(--danger-50)'
                        : notification.type === 'warning'
                        ? 'var(--warning-50)'
                        : notification.type === 'info'
                        ? 'var(--info-50)'
                        : notification.type === 'success'
                        ? 'var(--success-50)'
                        : 'var(--surface-100)',
                      border: `1px solid ${
                        notification.read
                          ? 'var(--border)'
                          : notification.type === 'critical'
                          ? 'var(--danger-200)'
                          : notification.type === 'warning'
                          ? 'var(--warning-200)'
                          : notification.type === 'info'
                          ? 'var(--info-200)'
                          : notification.type === 'success'
                          ? 'var(--success-200)'
                          : 'var(--border)'
                      }`,
                      opacity: notification.read ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (notification.link) {
                        e.currentTarget.style.transform = 'translateX(2px)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (notification.link) {
                        e.currentTarget.style.transform = 'translateX(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{notification.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: notification.priority === 'high' ? '600' : '500',
                          color: notification.read
                            ? 'var(--text-muted)'
                            : notification.type === 'critical'
                            ? 'var(--danger-700)'
                            : notification.type === 'warning'
                            ? 'var(--warning-700)'
                            : notification.type === 'info'
                            ? 'var(--info-700)'
                            : notification.type === 'success'
                            ? 'var(--success-700)'
                            : 'var(--text)',
                          lineHeight: 1.4,
                          marginBottom: '4px'
                        }}
                      >
                        {notification.message}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatTimestamp(notification.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {notification.link && (
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>→</span>
                      )}
                      <button
                        onClick={(e) => handleDismiss(notification.notification_id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: '16px',
                          color: 'var(--text-muted)',
                          lineHeight: 1,
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--danger-100)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
