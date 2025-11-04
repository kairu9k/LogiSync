import { useState } from "react";
import { Header, Footer } from "../components";
import { Link, useNavigate } from "react-router-dom";

export default function GetStarted() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = registration form, 2 = verification
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    agree: false,
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { apiPost } = await import('../lib/api')
      await apiPost('/api/auth/register', {
        name: form.name,
        company: form.company,
        email: form.email,
        password: form.password
      })
      setStep(2) // Move to verification step
    } catch (err) {
      alert(err.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    if (verificationCode.length !== 6) {
      alert('Please enter a 6-digit code')
      return
    }
    setVerifying(true)
    try {
      const { apiPost } = await import('../lib/api')
      await apiPost('/api/auth/verify-email', {
        email: form.email,
        code: verificationCode
      })
      alert('Email verified successfully! You can now sign in.')
      navigate('/signin')
    } catch (err) {
      alert(err.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const onResend = async () => {
    setResending(true)
    try {
      const { apiPost } = await import('../lib/api')
      await apiPost('/api/auth/resend-verification', { email: form.email })
      alert('Verification code resent! Check your email.')
    } catch (err) {
      alert(err.message || 'Failed to resend code')
    } finally {
      setResending(false)
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
        <div className="container" style={{ maxWidth: 520, width: "100%", margin: '0 auto' }}>
          {step === 1 ? (
            // Step 1: Registration Form
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '12px'
                }}>
                  Get Started
                </h1>
                <p style={{
                  fontSize: '1rem',
                  color: '#64748b'
                }}>
                  Create your LogiSync account
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label>
                      <div className="label" style={{
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#e2e8f0',
                        fontSize: '0.875rem'
                      }}>Full name</div>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={onChange}
                        placeholder="Jane Doe"
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
                          e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
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
                      }}>Company</div>
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={onChange}
                        placeholder="Acme Inc."
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
                          e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </label>
                  </div>
                  <label>
                    <div className="label" style={{
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#e2e8f0',
                      fontSize: '0.875rem'
                    }}>Work email</div>
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
                        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
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
                      placeholder="Create a strong password"
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
                        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </label>
                  <label
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={onChange}
                      required
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                      I agree to the Terms and Privacy Policy
                    </span>
                  </label>
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
                    {submitting ? "Creating account…" : "Create account"}
                  </button>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#cbd5e1',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    Already have an account?{' '}
                    <Link to="/signin" style={{
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontWeight: '600',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              </form>
            </>
          ) : (
            // Step 2: Email Verification
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '12px'
                }}>
                  Verify Your Email
                </h1>
                <p style={{
                  fontSize: '1rem',
                  color: '#64748b'
                }}>
                  Check your inbox for the verification code
                </p>
              </div>

              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '40px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
              }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                  <p style={{ fontSize: 18, marginBottom: 8, color: '#e2e8f0' }}>
                    We've sent a verification code to
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: "#3b82f6", marginBottom: 16 }}>
                    {form.email}
                  </p>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>
                    Please enter the 6-digit code to verify your account
                  </p>
                </div>
                <form onSubmit={onVerify} style={{ display: "grid", gap: 16 }}>
                  <label>
                    <div className="label" style={{
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#e2e8f0',
                      fontSize: '0.875rem'
                    }}>Verification Code</div>
                    <input
                      type="text"
                      className="input"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                      style={{
                        fontSize: 24,
                        textAlign: "center",
                        letterSpacing: "0.5em",
                        fontFamily: "monospace",
                        padding: '12px 16px',
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
                        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={verifying || verificationCode.length !== 6}
                    style={{
                      padding: '14px 24px',
                      fontSize: '16px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      border: 'none',
                      background: (verifying || verificationCode.length !== 6)
                        ? 'rgba(59, 130, 246, 0.5)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      cursor: (verifying || verificationCode.length !== 6) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (!verifying && verificationCode.length === 6) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!verifying && verificationCode.length === 6) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)'
                      }
                    }}
                  >
                    {verifying ? "Verifying…" : "Verify Email"}
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={resending}
                      style={{
                        fontSize: 14,
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        color: '#3b82f6',
                        cursor: resending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: '600',
                        opacity: resending ? 0.6 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!resending) {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                          e.currentTarget.style.borderColor = '#3b82f6'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!resending) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                        }
                      }}
                    >
                      {resending ? "Sending…" : "Resend Code"}
                    </button>
                  </div>
                  <div style={{ textAlign: "center", fontSize: '0.875rem', color: '#cbd5e1' }}>
                    Wrong email? <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", textDecoration: "underline", fontWeight: '600' }}>Go back</button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
