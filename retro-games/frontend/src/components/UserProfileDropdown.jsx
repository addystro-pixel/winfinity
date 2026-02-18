import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './UserProfileDropdown.css'

function UserProfileDropdown({ label, type = 'user', onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`profile-trigger ${type}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {label}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <Link to={type === 'admin' ? '/admin/settings' : '/user/settings'} className="dropdown-item" onClick={() => setIsOpen(false)}>
            Settings
          </Link>
          {onLogout && (
            <button type="button" className="dropdown-item" onClick={() => { setIsOpen(false); onLogout() }}>
              Logout
            </button>
          )}
          {!onLogout && (
            <Link to="/" className="dropdown-item" onClick={() => setIsOpen(false)}>
              Logout
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default UserProfileDropdown
