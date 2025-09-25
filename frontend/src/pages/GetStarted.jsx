import { useState } from "react";
import { Header, Footer } from "../components";
import { Link } from "react-router-dom";

export default function GetStarted() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    agree: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { apiPost } = await import('../lib/api')
      await apiPost('/api/auth/register', { name: form.name, company: form.company, email: form.email, password: form.password })
      alert('Account created')
    } catch (err) {
      alert(err.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="main">
        <div className="container" style={{ maxWidth: 880, width: "100%" }}>
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
