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
      <main className="main">
        <div className="container" style={{ maxWidth: 880, width: "100%" }}>
          <h1 className="section-title" style={{ marginBottom: 16, textAlign: 'center' }}>
            🚛 Driver Login
          </h1>

          <form className="card form-card form" onSubmit={handleLogin}>
            <div style={{ display: "grid", gap: 16 }}>
              {error && (
                <div style={{
                  background: 'var(--danger-50)',
                  color: 'var(--danger-600)',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid var(--danger-200)',
                  textAlign: 'center'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <label>
                <div className="label">Username</div>
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
                />
              </label>

              <label>
                <div className="label">Password</div>
                <input
                  type="password"
                  name="password"
                  required
                  value={form.password}
                  onChange={onChange}
                  placeholder="Enter your password"
                  className="input"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </label>

              <div className="helper" style={{
                background: 'var(--success-50)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--success-200)',
                color: 'var(--success-700)'
              }}>
                <strong>Demo Credentials:</strong><br />
                Username: <code>driver01</code><br />
                Password: <em>any password</em>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ fontSize: '16px', padding: '12px' }}
              >
                {loading ? '🔄 Signing in...' : '🔑 Sign in as Driver'}
              </button>

              <div className="helper" style={{ textAlign: 'center', marginTop: 8 }}>
                <Link to="/">← Back to Landing Page</Link> |
                <Link to="/signin" style={{ marginLeft: 8 }}>Admin Login</Link>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}