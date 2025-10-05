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
      <main className="main">
        <div className="container" style={{ maxWidth: 880, width: "100%" }}>
          <h1 className="section-title" style={{ marginBottom: 16 }}>
            Sign in
          </h1>
          <form className="card form-card form" onSubmit={onSubmit}>
            <div style={{ display: "grid", gap: 16 }}>
              <label>
                <div className="label">Email</div>
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
                  placeholder="••••••••"
                  className="input"
                />
              </label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={onChange}
                  />
                  <span className="muted">Remember me</span>
                </label>
                <a href="#" className="muted">
                  Forgot password?
                </a>
              </div>
              <div className="helper">Don't have an account? <Link to="/get-started">Get started</Link></div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
