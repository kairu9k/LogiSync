export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer id="contact" className="footer">
      <div className="container footer-inner">
        <div>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src="/logo_for_logisync.png" alt="LogiSync" style={{ height: '40px', width: 'auto' }} />
            <span className="brand-name">LogiSync</span>
          </div>
          <p className="muted">© {year} LogiSync Philippines. All rights reserved.</p>
          <p className="muted" style={{ fontSize: '14px', marginTop: '8px' }}>
            🇵🇭 Proudly serving logistics companies across the Philippines
          </p>
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="mailto:support@logisync.ph">Support</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>
      </div>
    </footer>
  )
}
