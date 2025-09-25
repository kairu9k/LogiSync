export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer id="contact" className="footer">
      <div className="container footer-inner">
        <div>
          <div className="brand"><span className="brand-mark">⟂</span><span className="brand-name">LogiSync</span></div>
          <p className="muted">© {year} LogiSync Inc. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
      </div>
    </footer>
  )
}
