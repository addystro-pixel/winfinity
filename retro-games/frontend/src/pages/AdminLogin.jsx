import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { adminLogin } from '../api/client'
import './AuthPages.css'

const ADMIN_TOKEN_KEY = 'winfinity_admin_token'

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, admin } = await adminLogin(email, password)
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
      if (admin) sessionStorage.setItem('winfinity_admin_data', JSON.stringify({ role: admin.role, permissions: admin.permissions }))
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message === 'CONNECTION_ERROR'
        ? 'Cannot connect to server. Run "npm start" to start both frontend and backend.'
        : (err.message || 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link">← Back to Home</Link>
      <div className="auth-card admin-card">
        <Logo size="medium" />
        <h1>Admin Login</h1>
        <p className="auth-subtitle">Manage your gaming platform</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="addystro@gmail.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="submit-btn admin-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
export { ADMIN_TOKEN_KEY }
