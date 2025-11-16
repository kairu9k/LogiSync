import { useEffect } from 'react'

/**
 * Toast Notification Component
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 * @param {function} onClose - Callback when toast closes
 * @param {number} duration - Auto-dismiss duration in ms (default: 3000)
 */
export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          icon: '✓',
        }
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          icon: '✕',
        }
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          icon: '⚠',
        }
      case 'info':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          icon: 'ℹ',
        }
      default:
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          icon: '✓',
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <>
      <style>{`
        @keyframes slideInDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        @keyframes slideOutUp {
          from {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translate(-50%, 0)',
          zIndex: 9999,
          animation: 'slideInDown 0.3s ease-out',
          minWidth: '320px',
          maxWidth: '500px',
        }}
      >
        <div
          style={{
            background: styles.background,
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
            }}
          >
            {styles.icon}
          </div>

          {/* Message */}
          <div
            style={{
              flex: 1,
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              lineHeight: '1.4',
            }}
          >
            {message}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}
