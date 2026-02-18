import './Logo.css'

function Logo({ size = 'medium' }) {
  return (
    <div className={`logo logo-${size}`}>
      <img
        src="/winfinity-logo.png"
        alt="Winfinity - Online Gaming Platform"
        className="logo-img"
      />
    </div>
  )
}

export default Logo
