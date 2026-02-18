import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { getAdminAdmins, addAdminFriend } from '../api/client'
import { ADMIN_TOKEN_KEY } from './AdminLogin'
import CollapsibleSection from '../components/CollapsibleSection'
import './Dashboard.css'
import './SettingsPage.css'

function AdminSettings() {
  const [admins, setAdmins] = useState([])
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)

  useEffect(() => {
    if (!token) {
      navigate('/login/admin')
      return
    }
    loadAdmins()
  }, [token, navigate])

  const loadAdmins = async () => {
    if (!token) return
    try {
      const data = await getAdminAdmins(token)
      setAdmins(data)
    } catch {
      setAdmins([])
    }
  }

  const handleAddFriend = async (friendAdminId) => {
    if (!token) return
    setAdding(friendAdminId)
    setError('')
    try {
      await addAdminFriend(friendAdminId, token)
      await loadAdmins()
    } catch (err) {
      setError(err.message || 'Failed to add friend')
    } finally {
      setAdding(null)
    }
  }

  if (!token) return null

  return (
    <div className="dashboard admin-dashboard">
      <header className="dashboard-header">
        <Link to="/admin/dashboard" className="logo-link">
          <Logo />
        </Link>
        <nav>
          <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
        </nav>
      </header>
      <main className="dashboard-main settings-main">
        <Link to="/admin/dashboard" className="back-to-dashboard">
          ← Back to Dashboard
        </Link>
        <h1>Admin Settings</h1>
        <p className="dashboard-subtitle">Manage your account and admin friends</p>

        <div className="settings-sections">
          <CollapsibleSection title="Admin Friends" defaultOpen>
            <div className="settings-content">
              <p>Add other admins as friends. Admins can only add other admins, not users.</p>
              {error && <p className="settings-error">{error}</p>}
              <h4>Admins</h4>
              {admins.length === 0 ? (
                <p className="no-friends">No other admins.</p>
              ) : (
                <ul className="friends-list admin-friends-list">
                  {admins.map((a) => (
                    <li key={a.id} className="admin-friend-item">
                      <span>{a.name} ({a.email})</span>
                      {a.isSelf ? (
                        <span className="self-badge">You</span>
                      ) : (
                        <button
                          type="button"
                          className="add-friend-btn"
                          onClick={() => handleAddFriend(a.id)}
                          disabled={a.isFriend || adding === a.id}
                        >
                          {a.isFriend ? 'Friends' : adding === a.id ? 'Adding...' : 'Add Friend'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Security">
            <div className="settings-content">
              <p>Admin account security settings.</p>
            </div>
          </CollapsibleSection>
        </div>
      </main>
    </div>
  )
}

export default AdminSettings
