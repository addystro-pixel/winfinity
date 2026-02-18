import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { verifyEmailToken } from '../api/client'
import { SOCIAL_LINKS } from '../config/social'
import './VerifyPage.css'

function VerifyPage() {
  const [searchParams] = useSearchParams()
  const done = searchParams.get('done')
  const error = searchParams.get('error')
  const already = searchParams.get('already')
  const token = searchParams.get('token')

  const [apiStatus, setApiStatus] = useState(null)

  useEffect(() => {
    if (token && !done && !error) {
      verifyEmailToken(token).then((data) => {
        if (data?.success && data?.status === 'verified') setApiStatus('verified')
        else if (data?.status === 'already_verified') setApiStatus('already_verified')
        else if (data?.status === 'expired') setApiStatus('expired')
        else setApiStatus('invalid')
      }).catch(() => setApiStatus('invalid'))
    }
  }, [token, done, error])

  const status = done === '1' && already === '1'
    ? 'already_verified'
    : done === '1'
      ? 'verified'
      : error === 'expired'
        ? 'expired'
        : error === 'invalid'
          ? 'invalid'
          : apiStatus ?? (token ? 'loading' : 'invalid')

  return (
    <div className="verify-page">
      <Logo size="large" />
      {status === 'loading' && (
        <div className="verify-result pending">
          <p className="verify-message">Checking verification...</p>
        </div>
      )}
      {status === 'verified' && (
        <div className="verify-result success">
          <h1>Congratulations! You got $5 freeplay!</h1>
          <p className="verify-status">Done ✅</p>
          <p className="verify-message">Last step to get your freeplay — follow us on Facebook or Instagram and text us there.</p>
          <div className="verify-social-buttons">
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="verify-fb-btn">Follow us on Facebook</a>
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="verify-ig-btn">Follow us on Instagram</a>
          </div>
          <Link to="/" className="verify-dashboard-link">Login to Dashboard</Link>
        </div>
      )}
      {status === 'already_verified' && (
        <div className="verify-result info">
          <h1>Congratulations! You got $5 freeplay!</h1>
          <p className="verify-message">Last step to get your freeplay — follow us on Facebook or Instagram and text us there.</p>
          <div className="verify-social-buttons">
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="verify-fb-btn">Follow us on Facebook</a>
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="verify-ig-btn">Follow us on Instagram</a>
          </div>
          <Link to="/" className="verify-dashboard-link">Login to Dashboard</Link>
        </div>
      )}
      {status === 'expired' && (
        <div className="verify-result error">
          <h1>Link Expired</h1>
          <p className="verify-message">This verification link has expired. Please sign up again to receive a new link.</p>
        </div>
      )}
      {status === 'invalid' && (
        <div className="verify-result error">
          <h1>Invalid Link</h1>
          <p className="verify-message">This verification link is invalid or has expired. Make sure the backend is running on port 3002.</p>
        </div>
      )}
      <Link to="/" className="verify-home-link">Back to Home</Link>
    </div>
  )
}

export default VerifyPage
