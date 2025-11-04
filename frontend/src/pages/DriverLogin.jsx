import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Header, Footer } from '../components'
import { apiPost } from '../lib/api'

export default function DriverLogin() {
  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Driver Login - LogiSync'
  }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiPost('/api/driver/login', {
        username: form.username.trim(),
        password: form.password.trim()
      })

      // Store driver info in localStorage
      localStorage.setItem('driver', JSON.stringify(response.driver))

      // Navigate to driver dashboard
      navigate('/driver/dashboard')
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="main" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        padding: '60px 20px'
      }}>
        <div className="container" style={{ maxWidth: 480, width: "100%", margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px'
            }}>
              🚛 Driver Portal
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b'
            }}>
              Sign in to access your deliveries
            </p>
          </div>

          <form className="card" onSubmit={handleLogin} style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ display: "grid", gap: 24 }}>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <label>
                <div className="label" style={{
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  fontSize: '0.875rem'
                }}>Username</div>
                <input
                  type="text"
                  name="username"
                  required
                  value={form.username}
                  onChange={onChange}
                  placeholder="Enter your username"
                  className="input"
                  disabled={loading}
                  autoComplete="username"
                  style={{
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    background: 'rgba(30, 41, 59, 0.5)',
                    color: '#e2e8f0'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </label>

              <label>
                <div className="label" style={{
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  fontSize: '0.875rem'
                }}>Password</div>
                <input
                  type="password"
                  name="password"
                  required
                  value={form.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  className="input"
                  disabled={loading}
                  autoComplete="current-password"
                  style={{
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    background: 'rgba(30, 41, 59, 0.5)',
                    color: '#e2e8f0'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '700',
                  borderRadius: '10px',
                  border: 'none',
                  background: loading
                    ? 'rgba(59, 130, 246, 0.5)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)'
                  }
                }}
              >
                {loading ? '🔄 Signing in...' : '🔑 Sign in as Driver'}
              </button>

              <div style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#cbd5e1',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Link to="/" style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#8b5cf6'}
                onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
                >
                  ← Back to Landing Page
                </Link>
                {' | '}
                <Link to="/signin" style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#8b5cf6'}
                onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}