import { useState, useEffect } from 'react'
import { isValidEmail, isValidPhone } from '../utils/validation'
import { submitSignup } from '../api/client'
import { COUNTRY_CODES } from '../config/countries'
import './SignupForm.css'

function SignupForm({ initialEmail = '', initialName = '', onSuccess }) {
  const [formData, setFormData] = useState({
    name: initialName,
    email: initialEmail,
    countryCode: '+1',
    number: '',
    password: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialEmail || initialName) {
      setFormData(prev => ({ ...prev, email: initialEmail, name: initialName }))
    }
  }, [initialEmail, initialName])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Full name is required' }))
      return
    }
    if (!isValidEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      return
    }
    if (!isValidPhone(formData.number, formData.countryCode)) {
      setErrors(prev => ({ ...prev, number: 'Please enter a valid phone number for your selected country' }))
      return
    }
    if (!formData.password || formData.password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }))
      return
    }

    setSubmitting(true)
    try {
      await submitSignup({
        name: formData.name,
        email: formData.email,
        countryCode: formData.countryCode,
        number: formData.number.trim(),
        password: formData.password,
      })
      setFormData({ name: '', email: '', countryCode: '+1', number: '', password: '' })
      setErrors({})
      setSubmitError('')
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="signup-success">
        <div className="success-icon">✓</div>
        <p>Account created successfully!</p>
        <p className="signup-success-sub">You can now sign in with your email and password.</p>
        <button type="button" className="resend-btn" onClick={() => onSuccess?.()}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Full name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="yourname@example.com"
          className={errors.email ? 'input-error' : ''}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone-number">Phone Number</label>
        <div className="phone-input-group">
          <select
            name="countryCode"
            value={formData.countryCode}
            onChange={handleChange}
            className="country-select"
            aria-label="Country code"
          >
            {COUNTRY_CODES.map(({ code, country }) => (
              <option key={code} value={code} title={country}>
                {code} {country}
              </option>
            ))}
          </select>
          <input
            type="tel"
            id="phone-number"
            name="number"
            value={formData.number}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, number: e.target.value }))
              setErrors(prev => ({ ...prev, number: '' }))
            }}
            placeholder="123 456 7890"
            autoComplete="tel"
            className={`phone-input ${errors.number ? 'input-error' : ''}`}
          />
        </div>
        {errors.number && <span className="field-error">{errors.number}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          minLength={6}
          autoComplete="new-password"
          className={errors.password ? 'input-error' : ''}
        />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      {submitError && <p className="submit-error">{submitError}</p>}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Sending...' : 'Join Now'}
      </button>
    </form>
  )
}

export default SignupForm
