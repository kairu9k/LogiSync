import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../lib/api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom truck icon for driver
const truckIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTA3OGZmIj48cGF0aCBkPSJNMTggMThoLTJ2LTFoMnYxem0tNSAwSDl2LTFoNHYxem0tNy01VjdoN3Y2SDZ6bTEzLTFoLTN2LTRoMi4zTDE5IDEwem0tMiA3Yy0xLjEgMC0yLS45LTItMnMyIC0uOSAyLTItMiAuOS0yIDIgLjkgMiAyIDJ6bTAgMmMtMi4yIDAtNC0xLjgtNC00czEuOC00IDQtNCA0IDEuOCA0IDQtMS44IDQtNCA0em0tNiAwYy0yLjIgMC00LTEuOC00LTRzMS44LTQgNC00IDQgMS44IDQgNC0xLjggNC00IDR6Ii8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// Component to auto-center map on driver location
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

// Swipeable Card Component with gesture detection
function SwipeableCard({ shipment, quickAction, onSwipe, onTap, onStatusUpdate, getStatusIcon, currentLocation }) {
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const touchStartTime = useRef(0)
  const longPressTimer = useRef(null)

  const minSwipeDistance = 100 // minimum distance for swipe to trigger

  const handleTouchStart = (e) => {
    setTouchEnd(0)
    setTouchStart(e.targetTouches[0].clientX)
    setIsSwiping(false)
    setIsLongPressing(false)
    touchStartTime.current = Date.now()

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true)
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      setShowStatusModal(true)
    }, 500) // 500ms for long press
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
    const distance = e.targetTouches[0].clientX - touchStart

    // Cancel long press if moving
    if (Math.abs(distance) > 10 && longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      setIsLongPressing(false)
    }

    // Only allow right swipe (positive distance) and only if quickAction exists
    if (distance > 0 && quickAction) {
      setSwipeOffset(Math.min(distance, 150)) // Cap at 150px
      setIsSwiping(true)
    }
  }

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    setTimeout(() => setIsLongPressing(false), 100)

    if (!touchStart || !touchEnd) return

    const distance = touchEnd - touchStart
    const isRightSwipe = distance > minSwipeDistance
    const touchDuration = Date.now() - touchStartTime.current

    if (isRightSwipe && quickAction) {
      // Trigger pickup action
      onSwipe()
    } else if (!isSwiping && Math.abs(distance) < 10 && touchDuration < 200) {
      // Quick tap - navigate to detail
      onTap()
    }

    // Reset
    setSwipeOffset(0)
    setIsSwiping(false)
    setTouchStart(0)
    setTouchEnd(0)
  }

  const swipeProgress = Math.min(swipeOffset / minSwipeDistance, 1)

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      {/* Background swipe indicator (shows when swiping) */}
      {quickAction && swipeOffset > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, ${quickAction.color} 0%, ${quickAction.color}dd ${swipeOffset}px, transparent ${swipeOffset}px)`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            zIndex: 0,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              opacity: swipeProgress,
              transform: `scale(${0.8 + swipeProgress * 0.2})`,
              transition: 'transform 0.1s ease',
            }}
          >
            {swipeProgress >= 1 ? '✅' : '➡️'}
          </div>
          <div
            style={{
              marginLeft: '10px',
              color: 'white',
              fontWeight: 600,
              opacity: swipeProgress,
            }}
          >
            {swipeProgress >= 1 ? 'Release to confirm!' : quickAction.label}
          </div>
        </div>
      )}

      {/* Card content */}
      <div
        className="card"
        style={{
          padding: '14px',
          transition: isSwiping ? 'none' : 'transform 0.3s ease, box-shadow 0.1s ease',
          transform: isLongPressing ? `translateX(${swipeOffset}px) scale(0.98)` : `translateX(${swipeOffset}px)`,
          border: '1px solid var(--gray-200)',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'var(--surface)',
          boxShadow: isLongPressing ? '0 0 0 3px rgba(59, 130, 246, 0.4)' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isSwiping && !showStatusModal && onTap()}
      >
        {/* Header: Tracking Number + Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            {shipment.tracking_number}
          </div>
          <span
            className={`badge ${
              shipment.status === 'delivered'
                ? 'success'
                : shipment.status === 'out_for_delivery'
                ? 'warn'
                : shipment.status === 'in_transit'
                ? 'info'
                : ''
            }`}
            style={{
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
            }}
          >
            <span>{getStatusIcon(shipment.status)}</span>
            <span>{shipment.status.replace('_', ' ')}</span>
          </span>
        </div>

        {/* Delivery Location */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            📍 DELIVERY TO
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'var(--text)',
              lineHeight: '1.4',
              fontWeight: 500,
            }}
          >
            {shipment.destination_address}
          </div>
        </div>

        {/* Customer & Contact in Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '10px',
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                marginBottom: '3px',
              }}
            >
              👤 CUSTOMER
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shipment.customer}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '10px',
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                marginBottom: '3px',
              }}
            >
              📞 CONTACT
            </div>
            <div
              style={{
                fontSize: '13px',
                color:
                  shipment.receiver_phone !== 'N/A'
                    ? 'var(--primary-600)'
                    : '#9ca3af',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shipment.receiver_phone !== 'N/A' ? shipment.receiver_phone : 'No phone'}
            </div>
          </div>
        </div>

        {/* Interaction hints */}
        {!showStatusModal && shipment.status !== 'delivered' && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#3b82f6',
              fontWeight: 600,
            }}
          >
            {quickAction && shipment.status === 'pending'
              ? '➡️ Swipe right to pickup | 📝 Long press to update'
              : '📝 Long press to update status'}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          shipment={shipment}
          onUpdate={onStatusUpdate}
          onClose={() => setShowStatusModal(false)}
          currentLocation={currentLocation}
        />
      )}
    </div>
  )
}

// Status Update Modal Component
function StatusUpdateModal({ shipment, onUpdate, onClose, currentLocation }) {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  // Auto-fill location with GPS coordinates when modal opens
  useEffect(() => {
    if (currentLocation && !location) {
      const coords = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
      setLocation(coords)
    }
  }, [currentLocation])

  const statusOptions = [
    { value: 'picked_up', label: '📦 Picked Up', icon: '📦', color: '#10b981' },
    { value: 'in_transit', label: '🚛 In Transit', icon: '🚛', color: '#3b82f6' },
    { value: 'out_for_delivery', label: '🚚 Out for Delivery', icon: '🚚', color: '#8b5cf6' },
    { value: 'delivered', label: '✅ Delivered', icon: '✅', color: '#10b981' },
    { value: 'delivery_attempted', label: '🔄 Delivery Attempted', icon: '🔄', color: '#f59e0b' },
    { value: 'exception', label: '⚠️ Exception/Problem', icon: '⚠️', color: '#ef4444' }
  ]

  const useCurrentLocation = () => {
    if (currentLocation) {
      const coords = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
      setLocation(coords)
    } else {
      // Try to get location if not already available
      setGettingLocation(true)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
            setLocation(coords)
            setGettingLocation(false)
          },
          (error) => {
            alert('Unable to get your location. Please enter manually.')
            setGettingLocation(false)
          }
        )
      } else {
        alert('Geolocation is not supported by your device')
        setGettingLocation(false)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStatus || !location.trim()) {
      alert('Please select a status and enter location')
      return
    }

    setUpdating(true)
    try {
      await onUpdate(shipment.id, selectedStatus, location.trim(), notes.trim())
      onClose()
    } catch (error) {
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text)' }}>📝 Update Status</h2>
          <button
            onClick={onClose}
            disabled={updating}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            ✖️
          </button>
        </div>

        {/* Shipment Info */}
        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Shipment</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
            {shipment.tracking_number}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Status Options */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              Select Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  disabled={updating}
                  style={{
                    padding: '12px',
                    border: selectedStatus === option.value ? `2px solid ${option.color}` : '1px solid var(--border)',
                    borderRadius: '8px',
                    background: selectedStatus === option.value ? `${option.color}15` : 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: selectedStatus === option.value ? option.color : 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{option.icon}</span>
                  <span>{option.label.replace(/^[^\s]+\s/, '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                📍 Current Location *
              </label>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={updating || gettingLocation}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  background: currentLocation ? '#10b981' : '#3b82f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: updating || gettingLocation ? 'not-allowed' : 'pointer',
                  opacity: updating || gettingLocation ? 0.6 : 1,
                }}
              >
                {gettingLocation ? '⏳ Getting...' : currentLocation ? '🔄 Refresh GPS' : '🔍 Get Location'}
              </button>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Manila Hub, Customer Location or GPS coords"
              disabled={updating}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
            {currentLocation && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#10b981' }}>
                ✓ GPS coordinates auto-filled from live tracking
              </div>
            )}
            {!currentLocation && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#f59e0b' }}>
                ⚠️ GPS tracking not active - Click "Get Location" or enter manually
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              📝 Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or details..."
              disabled={updating}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--surface)',
                color: 'var(--text)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !selectedStatus || !location.trim()}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: updating || !selectedStatus || !location.trim() ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: updating || !selectedStatus || !location.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {updating ? '🔄 Updating...' : '✅ Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null)
  const [shipments, setShipments] = useState([])
  const [summary, setSummary] = useState(null)
  const [vehicleCapacity, setVehicleCapacity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Global GPS Tracking State
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const trackingIntervalRef = useRef(null)
  const watchIdRef = useRef(null)

  useEffect(() => {
    document.title = 'Driver Dashboard - LogiSync'

    // Check if driver is logged in
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      navigate('/driver/login')
      return
    }

    try {
      const parsedDriver = JSON.parse(driverData)
      setDriver(parsedDriver)
      loadShipments(parsedDriver.id)
    } catch (e) {
      navigate('/driver/login')
    }
  }, [navigate])

  const loadShipments = async (driverId) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiGet(`/api/driver/shipments?driver_id=${driverId}`)
      setShipments(response?.data || [])
      setSummary(response?.summary || {})
      setVehicleCapacity(response?.vehicle_capacity || null)
    } catch (e) {
      setError(e.message || 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStatusUpdate = async (shipmentId, newStatus) => {
    try {
      // Find the shipment to get origin info
      const shipment = shipments.find(s => s.id === shipmentId)
      const locationText = newStatus === 'picked_up' && shipment?.customer
        ? `Picked up from warehouse`
        : 'In transit'

      await apiPatch(`/api/driver/shipments/${shipmentId}/status`, {
        status: newStatus,
        location: locationText,
        notes: 'Quick status update via swipe gesture',
        driver_id: driver.id
      })

      // Reload shipments to show updated status
      await loadShipments(driver.id)
    } catch (e) {
      alert('Failed to update status: ' + (e.message || 'Unknown error'))
    }
  }

  const handleFullStatusUpdate = async (shipmentId, newStatus, location, notes) => {
    try {
      await apiPatch(`/api/driver/shipments/${shipmentId}/status`, {
        status: newStatus,
        location: location,
        notes: notes || 'Status updated via driver dashboard',
        driver_id: driver.id
      })

      // Reload shipments to show updated status
      await loadShipments(driver.id)
    } catch (e) {
      throw new Error(e.message || 'Failed to update status')
    }
  }

  const getQuickActionButton = (shipment) => {
    switch (shipment.status) {
      case 'pending':
        return {
          label: '📦 Confirm Pickup',
          nextStatus: 'picked_up',
          color: '#10b981',
          confirmMessage: '✅ Confirm that the package has been loaded onto your vehicle?'
        }
      case 'picked_up':
        return {
          label: '🚛 Start Journey',
          nextStatus: 'in_transit',
          color: '#3b82f6',
          confirmMessage: '🚛 Start the journey to the customer?'
        }
      case 'in_transit':
        return {
          label: '🚚 Out for Delivery',
          nextStatus: 'out_for_delivery',
          color: '#f59e0b',
          confirmMessage: '🚚 Mark as out for delivery? (You should be near the destination)'
        }
      case 'out_for_delivery':
        return {
          label: '✅ Mark Delivered',
          nextStatus: 'delivered',
          color: '#059669',
          confirmMessage: '✅ Confirm that the package has been successfully delivered to the customer?'
        }
      case 'delivered':
        return null // No action needed for delivered shipments
      default:
        return null
    }
  }

  const handleLogout = () => {
    stopGPSTracking() // Stop tracking before logout
    localStorage.removeItem('driver')
    navigate('/driver/login')
  }

  // GPS Tracking Functions
  const sendGPSLocationToAllShipments = async (position) => {
    if (!driver || !shipments || shipments.length === 0) return

    const { latitude, longitude, speed, accuracy } = position.coords

    // Get all active shipments (not delivered or cancelled)
    const activeShipments = shipments.filter(s =>
      s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending'
    )

    if (activeShipments.length === 0) {
      console.log('No active shipments to update')
      return
    }

    // Update location for all active shipments
    const updatePromises = activeShipments.map(shipment =>
      apiPost(`/api/shipments/${shipment.id}/location`, {
        latitude,
        longitude,
        speed: speed || 0,
        accuracy: accuracy || 0,
        driver_id: driver.id
      }).catch(err => {
        console.error(`Failed to update location for shipment ${shipment.id}:`, err)
        return null
      })
    )

    try {
      await Promise.all(updatePromises)

      setCurrentLocation({
        latitude,
        longitude,
        accuracy,
        timestamp: new Date()
      })
      setLastUpdateTime(new Date())

      console.log(`GPS location sent to ${activeShipments.length} active shipments`)
    } catch (e) {
      console.error('Failed to send GPS location:', e)
      setGpsError('Failed to update location for some shipments')
    }
  }

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }

    // Check if there are active shipments
    const activeShipments = shipments.filter(s =>
      s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending'
    )

    if (activeShipments.length === 0) {
      setGpsError('No active shipments to track')
      return
    }

    setGpsError('')
    setIsTracking(true)

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ GPS location obtained:', position.coords)
        sendGPSLocationToAllShipments(position)
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        }
        setCurrentLocation(location)
        console.log('✅ Map should now be visible with location:', location)
        setGpsError('')
      },
      (error) => {
        console.error('Initial GPS error:', error)
        if (error.code === 1) {
          setGpsError('Location permission denied. Please enable location access.')
          stopGPSTracking()
        } else if (error.code === 2) {
          setGpsError('Location unavailable. GPS may not work on localhost.')
        } else {
          setGpsError('Getting location... (this may take a moment)')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        })
        setGpsError('')
      },
      (error) => {
        console.error('GPS tracking error:', error)
        if (error.code === 1) {
          setGpsError('Location permission denied')
          stopGPSTracking()
        } else if (error.code === 2) {
          setGpsError('Location unavailable')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )

    // Send location every 30 seconds
    trackingIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendGPSLocationToAllShipments,
        (error) => {
          console.error('GPS send error:', error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    }, 30000) // Update every 30 seconds
  }

  const stopGPSTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }

    setIsTracking(false)
    setGpsError('')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGPSTracking()
    }
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'picked_up': return 'status-info'
      case 'in_transit': return 'status-transit'
      case 'out_for_delivery': return 'status-delivery'
      case 'delivered': return 'status-delivered'
      default: return 'status-default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '📦'
      case 'picked_up': return '✅'
      case 'in_transit': return '🚛'
      case 'out_for_delivery': return '🚚'
      case 'delivered': return '✅'
      default: return '📋'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent'
      case 'high': return 'priority-high'
      default: return 'priority-normal'
    }
  }

  if (loading && !driver) {
    return (
      <div className="driver-container">
        <div className="driver-loading">
          <div className="loading-spinner">🔄</div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="driver-container" style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>🚛 Driver Dashboard</h1>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>Welcome, {driver?.username}</p>
          </div>
          <button
            className="btn btn-outline"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Global GPS Tracking Card */}
      <div className="card" style={{
        padding: '20px',
        marginBottom: '16px',
        background: isTracking
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>
                {isTracking ? '📡' : '📍'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  {isTracking ? 'GPS Tracking Active' : 'Global GPS Tracking'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {isTracking
                    ? `Tracking ${shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending').length} active shipments`
                    : 'Start tracking to update all shipments automatically'
                  }
                </p>
              </div>
            </div>

            {isTracking && currentLocation && (
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, marginBottom: '4px' }}>
                    📍 LOCATION ACTIVE
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    Accuracy: ±{currentLocation.accuracy.toFixed(0)}m
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>Last Update</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Just now'}
                  </div>
                </div>
              </div>
            )}

            {gpsError && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
            {!isTracking ? (
              <button
                className="btn"
                onClick={startGPSTracking}
                disabled={shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'pending').length === 0}
                style={{
                  background: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚀</span>
                <span>Start Tracking</span>
              </button>
            ) : (
              <>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚡</div>
                  <div>Updating every 30s</div>
                </div>
                <button
                  className="btn"
                  onClick={stopGPSTracking}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.5)',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>⏹️</span>
                  <span>Stop Tracking</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
              {summary.pending || 0}
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>📦 Pending</div>
          </div>
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
              {summary.in_transit || 0}
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>🚛 In Transit</div>
          </div>
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
              {summary.out_for_delivery || 0}
            </div>
            <div className="muted" style={{ fontSize: '13px' }}>🚚 For Delivery</div>
          </div>
        </div>
      )}

      {/* Vehicle Capacity Indicator */}
      {vehicleCapacity && (
        <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>
                🚛 {vehicleCapacity.vehicle_id} - {vehicleCapacity.vehicle_type}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginBottom: '2px' }}>Load</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: vehicleCapacity.utilization_percent >= 90 ? '#ef4444' : vehicleCapacity.utilization_percent >= 70 ? '#f59e0b' : '#3b82f6' }}>
                  {vehicleCapacity.current_load} kg
                </div>
              </div>

              <div style={{ fontSize: '20px', color: 'var(--gray-400)' }}>/</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginBottom: '2px' }}>Capacity</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                  {vehicleCapacity.capacity} kg
                </div>
              </div>

              <div style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: vehicleCapacity.utilization_percent >= 90 ? '#fee2e2' : vehicleCapacity.utilization_percent >= 70 ? '#fef3c7' : '#dbeafe',
                color: vehicleCapacity.utilization_percent >= 90 ? '#991b1b' : vehicleCapacity.utilization_percent >= 70 ? '#92400e' : '#1e40af',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                {vehicleCapacity.utilization_percent}%
              </div>
            </div>
          </div>

          {vehicleCapacity.utilization_percent >= 90 && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: '#fee2e2',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#991b1b',
              fontWeight: '500'
            }}>
              ⚠️ Near capacity limit - be cautious with additional loads
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
          <p style={{ margin: 0, color: 'var(--gray-600)' }}>Loading shipments...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--danger-600)' }}>⚠️</div>
          <p style={{ margin: '0 0 16px 0', color: 'var(--danger-700)' }}>{error}</p>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {!loading && !error && shipments.length === 0 && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No Active Shipments</h3>
          <p style={{ margin: '0 0 24px 0', color: 'var(--gray-600)' }}>You have no shipments assigned for today.</p>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {!loading && !error && shipments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {shipments.map((shipment) => {
            const quickAction = getQuickActionButton(shipment)

            return (
              <SwipeableCard
                key={shipment.id}
                shipment={shipment}
                quickAction={quickAction}
                onSwipe={() => handleQuickStatusUpdate(shipment.id, quickAction?.nextStatus)}
                onTap={() => navigate(`/driver/shipment/${shipment.id}`)}
                onStatusUpdate={handleFullStatusUpdate}
                getStatusIcon={getStatusIcon}
                currentLocation={currentLocation}
              />
            )
          })}
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => loadShipments(driver?.id)}
            disabled={loading}
            style={{ minWidth: '200px' }}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Shipments'}
          </button>
        </div>
      )}
    </div>
  )
}