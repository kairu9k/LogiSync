import { useState } from "react";
import { Header, Footer } from "../components";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function SignIn() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    console.log('Form submitted');
    try {
      const { apiPost } = await import('../lib/api')
      console.log('Attempting login with:', form.email, form.password);
      const response = await apiPost('/api/auth/login', { email: form.email, password: form.password })
      console.log('Login response:', response);
      // Save the full auth response including user role
      localStorage.setItem('auth', JSON.stringify(response));
      console.log('Saved to localStorage:', localStorage.getItem('auth'));
      const from = location.state?.from?.pathname || '/app';
      console.log('Navigating to:', from);
      navigate(from, { replace: true });
      console.log('Navigation completed');
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed: ' + (err.message || 'Unknown error'))
    } finally {
      console.log('Setting submitting to false');
      setSubmitting(false);
    }
  };

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
              Welcome Back
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b'
            }}>
              Sign in to your LogiSync account
            </p>
          </div>

          <form className="card" onSubmit={onSubmit} style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ display: "grid", gap: 24 }}>
              <label>
                <div className="label" style={{
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  fontSize: '0.875rem'
                }}>Email</div>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={onChange}
                  placeholder="you@company.com"
                  className="input"
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: '0.875rem'
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={onChange}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: '#cbd5e1' }}>Remember me</span>
                </label>
                <a href="#" style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
                >
                  Forgot password?
                </a>
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '700',
                  borderRadius: '10px',
                  border: 'none',
                  background: submitting
                    ? 'rgba(59, 130, 246, 0.5)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)'
                  }
                }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
              <div style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#cbd5e1',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Don't have an account?{' '}
                <Link to="/get-started" style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
                >
                  Get started
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
