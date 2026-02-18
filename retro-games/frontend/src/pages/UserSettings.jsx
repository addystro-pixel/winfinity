import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { getFriends, searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend } from '../api/client'
import CollapsibleSection from '../components/CollapsibleSection'
import './Dashboard.css'
import './SettingsPage.css'

function UserSettings() {
  const { user, token, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState('')
  const [removeModal, setRemoveModal] = useState(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/', { replace: true })
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    if (token) {
      loadFriends()
      loadFriendRequests()
    }
  }, [token])

  const loadFriendRequests = async () => {
    if (!token) return
    try {
      const data = await getFriendRequests(token)
      setFriendRequests(data)
    } catch {
      setFriendRequests([])
    }
  }

  useEffect(() => {
    if (!token || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const t = setTimeout(() => {
      searchUsers(searchQuery, token).then(setSearchResults).catch(() => setSearchResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, token])

  const loadFriends = async () => {
    if (!token) return
    try {
      const data = await getFriends(token)
      setFriends(data)
    } catch {
      setFriends([])
    }
  }

  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    try {
      const results = await searchUsers(searchQuery, token)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    }
  }

  const handleSendRequest = async (friendId) => {
    if (!token) return
    setAdding(friendId)
    setError('')
    try {
      await sendFriendRequest(friendId, token)
      const results = await searchUsers(searchQuery, token)
      setSearchResults(results)
    } catch (err) {
      setError(err.message || 'Failed to send request')
    } finally {
      setAdding(null)
    }
  }

  const handleAcceptRequest = async (requestId) => {
    if (!token) return
    setAdding(`accept-${requestId}`)
    setError('')
    try {
      await acceptFriendRequest(requestId, token)
      await loadFriends()
      await loadFriendRequests()
    } catch (err) {
      setError(err.message || 'Failed to accept')
    } finally {
      setAdding(null)
    }
  }

  const handleRemoveFriend = async (friendId) => {
    if (!token) return
    setRemoveModal(null)
    setAdding(`remove-${friendId}`)
    setError('')
    try {
      await removeFriend(friendId, token)
      await loadFriends()
    } catch (err) {
      setError(err.message || 'Failed to remove')
    } finally {
      setAdding(null)
    }
  }

  const handleRejectRequest = async (requestId) => {
    if (!token) return
    setAdding(`reject-${requestId}`)
    setError('')
    try {
      await rejectFriendRequest(requestId, token)
      await loadFriendRequests()
    } catch (err) {
      setError(err.message || 'Failed to reject')
    } finally {
      setAdding(null)
    }
  }

  if (loading || !isAuthenticated) return null

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link to="/user/dashboard" className="logo-link">
          <Logo />
        </Link>
        <nav>
          <Link to="/user/dashboard" className="nav-link">Dashboard</Link>
        </nav>
      </header>
      <main className="dashboard-main settings-main">
        <Link to="/user/dashboard" className="back-to-dashboard">
          ← Back to Dashboard
        </Link>
        <h1>User Settings</h1>
        <p className="dashboard-subtitle">Manage your profile and friends</p>

        <div className="settings-sections">
          <CollapsibleSection title="Profile" defaultOpen>
            <div className="settings-content">
              <div className="settings-field">
                <label>Name</label>
                <input type="text" value={user?.name || ''} readOnly className="readonly" />
              </div>
              <div className="settings-field">
                <label>Email</label>
                <input type="email" value={user?.email || ''} readOnly className="readonly" />
              </div>
              <div className="settings-field">
                <label>Phone</label>
                <input type="text" value={user?.number || ''} readOnly className="readonly" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Friends" defaultOpen>
            <div className="settings-content">
              <p>Add other verified users as friends. They must accept your request first.</p>
              {friendRequests.length > 0 && (
                <>
                  <h4>Friend Requests ({friendRequests.length})</h4>
                  <ul className="friend-requests-list-settings">
                    {friendRequests.map((r) => (
                      <li key={r.id} className="friend-request-item-settings">
                        <span>{r.name}</span>
                        <div className="friend-request-actions">
                          <button
                            type="button"
                            className="accept-friend-btn"
                            onClick={() => handleAcceptRequest(r.id)}
                            disabled={adding === `accept-${r.id}`}
                          >
                            {adding === `accept-${r.id}` ? '...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="reject-friend-btn"
                            onClick={() => handleRejectRequest(r.id)}
                            disabled={adding === `reject-${r.id}`}
                          >
                            {adding === `reject-${r.id}` ? '...' : 'Reject'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="friend-search">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button type="button" className="friend-search-btn" onClick={handleSearch}>
                  Search
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="friend-search-results">
                  {searchResults.map((u) => (
                    <div key={u.id} className="friend-result-item">
                      <span>{u.name}</span>
                      {u.isFriend ? (
                        <span className="friend-status-badge">Friends</span>
                      ) : u.requestReceived && u.requestId ? (
                        <div className="friend-request-actions">
                          <button
                            type="button"
                            className="accept-friend-btn"
                            onClick={() => handleAcceptRequest(u.requestId)}
                            disabled={adding === `accept-${u.requestId}`}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="reject-friend-btn"
                            onClick={() => handleRejectRequest(u.requestId)}
                            disabled={adding === `reject-${u.requestId}`}
                          >
                            Reject
                          </button>
                        </div>
                      ) : u.requestSent ? (
                        <span className="friend-status-badge pending">Request Sent</span>
                      ) : (
                        <button
                          type="button"
                          className="add-friend-btn"
                          onClick={() => handleSendRequest(u.id)}
                          disabled={adding === u.id}
                        >
                          {adding === u.id ? 'Sending...' : 'Add Friend'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="settings-error">{error}</p>}
              {removeModal && (
                <div className="remove-modal-overlay" onClick={() => setRemoveModal(null)}>
                  <div className="remove-modal" onClick={(e) => e.stopPropagation()}>
                    <h4>Remove friend?</h4>
                    <p>Are you sure you want to remove <strong>{removeModal.name}</strong> from your friends?</p>
                    <div className="remove-modal-actions">
                      <button type="button" className="remove-modal-cancel" onClick={() => setRemoveModal(null)}>Cancel</button>
                      <button
                        type="button"
                        className="remove-modal-confirm"
                        onClick={() => handleRemoveFriend(removeModal.id)}
                        disabled={adding === `remove-${removeModal.id}`}
                      >
                        {adding === `remove-${removeModal.id}` ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <h4>Your Friends ({friends.length})</h4>
              {friends.length === 0 ? (
                <p className="no-friends">No friends yet. Search above to add users.</p>
              ) : (
                <ul className="friends-list">
                  {friends.map((f) => (
                    <li key={f.id} className="friend-item-with-remove">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        className="remove-friend-btn"
                        onClick={() => setRemoveModal({ id: f.id, name: f.name })}
                        disabled={adding === `remove-${f.id}`}
                        title="Remove friend"
                      >
                        {adding === `remove-${f.id}` ? '...' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Notifications">
            <div className="settings-content">
              <div className="settings-field checkbox-field">
                <label><input type="checkbox" defaultChecked /> Email notifications</label>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </main>
    </div>
  )
}

export default UserSettings
