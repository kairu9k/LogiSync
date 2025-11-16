import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)
  const [status, setStatus] = useState('processing') // 'processing', 'success', 'cancelled', 'error'

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const subscriptionId = urlParams.get('subscription_id')
    const paymentStatus = urlParams.get('payment')
    const isPopup = window.opener && window.opener !== window

    // Check if payment was cancelled
    if (paymentStatus === 'cancelled') {
      setStatus('cancelled')
      // Start countdown to close
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            if (isPopup) {
              window.close()
            } else {
              navigate('/app/settings/subscription')
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return
    }

    if (subscriptionId) {
      // Process payment success
      apiPost('/api/subscriptions/payment-success', { subscription_id: subscriptionId })
        .then(() => {
          setStatus('success')
          // Start countdown
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval)
                if (isPopup) {
                  // Close popup window
                  window.close()
                } else {
                  // Redirect to subscription page
                  navigate('/app/settings/subscription')
                }
                return 0
              }
              return prev - 1
            })
          }, 1000)
        })
        .catch(() => {
          setStatus('error')
          setTimeout(() => {
            if (isPopup) {
              window.close()
            } else {
              navigate('/app/settings/subscription')
            }
          }, 3000)
        })
    } else {
      // No subscription ID, redirect
      if (isPopup) {
        window.close()
      } else {
        navigate('/app/settings/subscription')
      }
    }
  }, [navigate])

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          iconBg: '#10b981',
          title: 'Payment Successful!',
          message: 'Your subscription has been activated successfully. A receipt has been sent to your email.',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      case 'cancelled':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ),
          iconBg: '#ef4444',
          title: 'Payment Cancelled',
          message: 'Your payment has been cancelled. No charges were made.',
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        }
      case 'error':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ),
          iconBg: '#ef4444',
          title: 'Activation Error',
          message: 'Payment was completed but activation failed. Please contact support.',
          gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
        }
      default:
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          ),
          iconBg: '#6b7280',
          title: 'Processing...',
          message: 'Please wait while we process your payment.',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: config.gradient,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Status Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: config.iconBg,
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {config.icon}
        </div>

        <h1 style={{
          margin: '0 0 16px',
          fontSize: '28px',
          fontWeight: '700',
          color: '#1a1a1a'
        }}>
          {config.title}
        </h1>

        <p style={{
          margin: '0 0 24px',
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          {config.message}
        </p>

        {status !== 'processing' && (
          <>
            <div style={{
              background: '#f3f4f6',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '32px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280'
              }}>
                This window will close in{' '}
                <strong style={{ color: '#5469d4', fontSize: '18px' }}>{countdown}</strong>{' '}
                {countdown === 1 ? 'second' : 'seconds'}
              </p>
            </div>

            <p style={{
              margin: '24px 0 0',
              fontSize: '13px',
              color: '#9ca3af'
            }}>
              You can also close this window manually
            </p>
          </>
        )}
      </div>
    </div>
  )
}
