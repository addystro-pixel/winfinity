import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import SignupForm from '../components/SignupForm'
import { useAuth } from '../context/AuthContext'
import { SOCIAL_LINKS } from '../config/social'
import './LoginSignupPage.css'

function LoginForm({ onSwitchToSignup, signupSuccess, onDismissSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/user/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {signupSuccess && (
        <div className="auth-success-banner">
          <span className="auth-success-icon">✓</span>
          <span>Account created successfully!</span>
          <button type="button" className="auth-success-dismiss" onClick={onDismissSuccess} aria-label="Dismiss">×</button>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="login-email">Email</label>
        <input
          type="email"
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-group">
        <label htmlFor="login-password">Password</label>
        <div className="password-input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="auth-submit-btn" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <button type="button" className="switch-link" onClick={onSwitchToSignup}>
          Sign up
        </button>
      </p>
    </form>
  )
}

function SignupPanel({ onSwitchToLogin }) {
  return (
    <div className="signup-panel">
      <SignupForm onSuccess={onSwitchToLogin} />
      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="switch-link" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </div>
  )
}

function LoginSignupPage() {
  const [mode, setMode] = useState('login')
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSignupSuccess = () => {
    setSignupSuccess(true)
    setMode('login')
  }

  return (
    <div className="login-signup-page">
      <div className="auth-layout">
        <div className="auth-brand">
          <Logo size="large" />
          <h1>Winfinity</h1>
          <p className="tagline">Your Ultimate Online Gaming Destination</p>
          <div className="brand-social">
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="brand-social-link" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="brand-social-link" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {mode === 'login' ? (
            <LoginForm onSwitchToSignup={() => { setSignupSuccess(false); setMode('signup') }} signupSuccess={signupSuccess} onDismissSuccess={() => setSignupSuccess(false)} />
          ) : (
            <SignupPanel onSwitchToLogin={handleSignupSuccess} />
          )}

          <p className="auth-admin">
            Admin? <Link to="/login/admin">Login here</Link>
            {' · '}
            <Link to="/games">Browse games</Link>
          </p>
        </div>
      </div>

      <footer className="auth-footer">
        <p>© 2025 Winfinity. Play. Compete. Win.</p>
      </footer>
    </div>
  )
}

export default LoginSignupPage
