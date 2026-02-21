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
  const [submitError, setSubmitError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
        <div className="password-input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            minLength={6}
            autoComplete="new-password"
            className={errors.password ? 'input-error' : ''}
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
