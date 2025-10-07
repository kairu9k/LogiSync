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
      <main className="main">
        <div className="container" style={{ maxWidth: 880, width: "100%" }}>
          {step === 1 ? (
            // Step 1: Registration Form
            <>
              <h1 className="section-title" style={{ marginBottom: 16 }}>
                Get started
              </h1>
              <form className="card form-card form" onSubmit={onSubmit}>
                <div style={{ display: "grid", gap: 16 }}>
                  <div className="form-row">
                    <label>
                      <div className="label">Full name</div>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={onChange}
                        placeholder="Jane Doe"
                        className="input"
                      />
                    </label>
                    <label>
                      <div className="label">Company</div>
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={onChange}
                        placeholder="Acme Inc."
                        className="input"
                      />
                    </label>
                  </div>
                  <label>
                    <div className="label">Work email</div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={onChange}
                      placeholder="you@company.com"
                      className="input"
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
                      placeholder="Create a strong password"
                      className="input"
                    />
                  </label>
                  <label
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={onChange}
                      required
                    />
                    <span className="muted">
                      I agree to the Terms and Privacy Policy
                    </span>
                  </label>
                  <div className="helper">Already have an account? <Link to="/signin">Sign in</Link></div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Creating account…" : "Create account"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            // Step 2: Email Verification
            <>
              <h1 className="section-title" style={{ marginBottom: 16 }}>
                Verify your email
              </h1>
              <div className="card form-card" style={{ padding: 32 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                  <p style={{ fontSize: 18, marginBottom: 8 }}>
                    We've sent a verification code to
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: "var(--primary-600)", marginBottom: 16 }}>
                    {form.email}
                  </p>
                  <p className="muted" style={{ fontSize: 14 }}>
                    Please enter the 6-digit code to verify your account
                  </p>
                </div>
                <form onSubmit={onVerify} style={{ display: "grid", gap: 16 }}>
                  <label>
                    <div className="label">Verification Code</div>
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
                        fontFamily: "monospace"
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={verifying || verificationCode.length !== 6}
                  >
                    {verifying ? "Verifying…" : "Verify Email"}
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={onResend}
                      disabled={resending}
                      style={{ fontSize: 14 }}
                    >
                      {resending ? "Sending…" : "Resend Code"}
                    </button>
                  </div>
                  <div className="helper" style={{ textAlign: "center" }}>
                    Wrong email? <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "var(--primary-600)", cursor: "pointer", textDecoration: "underline" }}>Go back</button>
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
