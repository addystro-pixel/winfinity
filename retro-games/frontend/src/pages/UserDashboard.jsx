import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import SignupForm from '../components/SignupForm'
import UserProfileDropdown from '../components/UserProfileDropdown'
import GamesSection from '../components/GamesSection'
import ChatWithUs from '../components/ChatWithUs'
import VoiceMessagePlayer from '../components/VoiceMessagePlayer'
import MessageStatus from '../components/MessageStatus'
import { useAuth } from '../context/AuthContext'
import { getFeed, getFriends, searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getDirectMessages, sendDirectMessage } from '../api/client'
import './Dashboard.css'
import './UserDashboard.css'

function DashboardContent() {
  const { user, token, logout } = useAuth()
  const [feed, setFeed] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [adding, setAdding] = useState(null)
  const [friendError, setFriendError] = useState('')
  const [activeChat, setActiveChat] = useState('support')
  const [dmMessages, setDmMessages] = useState([])
  const [dmInput, setDmInput] = useState('')
  const [dmSending, setDmSending] = useState(false)
  const [dmImagePreview, setDmImagePreview] = useState(null)
  const [dmImageFile, setDmImageFile] = useState(null)
  const [dmRecording, setDmRecording] = useState(false)
  const dmMessagesEndRef = useRef(null)
  const dmMediaRecorderRef = useRef(null)
  const dmChunksRef = useRef([])
  const [activeSection, setActiveSection] = useState('overview')
  const [removeModal, setRemoveModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadFeed = useCallback(async () => {
    try {
      const posts = await getFeed()
      setFeed(posts)
    } catch {
      setFeed([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFriends = useCallback(async () => {
    if (!token) return
    try {
      const data = await getFriends(token)
      setFriends(data)
    } catch {
      setFriends([])
    }
  }, [token])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const loadFriendRequests = useCallback(async () => {
    if (!token) return
    try {
      const data = await getFriendRequests(token)
      setFriendRequests(data)
    } catch {
      setFriendRequests([])
    }
  }, [token])

  useEffect(() => {
    if (token && (activeSection === 'friends' || activeSection === 'chat')) {
      loadFriends()
      if (activeSection === 'friends') loadFriendRequests()
    }
  }, [token, activeSection, loadFriends, loadFriendRequests])

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

  const handleSearch = useCallback(async () => {
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
  }, [token, searchQuery])

  const handleSendRequest = async (friendId) => {
    if (!token) return
    setAdding(friendId)
    setFriendError('')
    try {
      await sendFriendRequest(friendId, token)
      await handleSearch()
    } catch (err) {
      setFriendError(err.message || 'Failed to send request')
    } finally {
      setAdding(null)
    }
  }

  const handleAcceptRequest = async (requestId) => {
    if (!token) return
    setAdding(`accept-${requestId}`)
    setFriendError('')
    try {
      await acceptFriendRequest(requestId, token)
      await loadFriends()
      await loadFriendRequests()
    } catch (err) {
      setFriendError(err.message || 'Failed to accept')
    } finally {
      setAdding(null)
    }
  }

  const handleRejectRequest = async (requestId) => {
    if (!token) return
    setAdding(`reject-${requestId}`)
    setFriendError('')
    try {
      await rejectFriendRequest(requestId, token)
      await loadFriendRequests()
    } catch (err) {
      setFriendError(err.message || 'Failed to reject')
    } finally {
      setAdding(null)
    }
  }

  const handleRemoveFriend = async (friendId) => {
    if (!token) return
    setRemoveModal(null)
    setAdding(`remove-${friendId}`)
    setFriendError('')
    try {
      await removeFriend(friendId, token)
      if (chatFriend?.id === friendId) setChatFriend(null)
      if (activeChat === friendId) setActiveChat('support')
      await loadFriends()
    } catch (err) {
      setFriendError(err.message || 'Failed to remove')
    } finally {
      setAdding(null)
    }
  }

  const chatFriend = activeChat !== 'support' ? friends.find((f) => f.id === activeChat) : null

  const loadDmMessages = useCallback(async () => {
    if (!token || !chatFriend) return
    try {
      const msgs = await getDirectMessages(chatFriend.id, token)
      setDmMessages(msgs)
    } catch {
      setDmMessages([])
    }
  }, [token, chatFriend])

  useEffect(() => {
    if (chatFriend) loadDmMessages()
    else setDmMessages([])
  }, [chatFriend, loadDmMessages])

  useEffect(() => {
    dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dmMessages])

  useEffect(() => {
    if (!chatFriend) return
    const interval = setInterval(loadDmMessages, 3000)
    return () => clearInterval(interval)
  }, [chatFriend, loadDmMessages])

  const handleSendDm = async (e) => {
    e.preventDefault()
    if (!token || !chatFriend) return
    const hasContent = dmInput.trim() || dmImageFile
    if (!hasContent) return
    setDmSending(true)
    try {
      await sendDirectMessage(chatFriend.id, dmInput.trim(), token, { image: dmImageFile || undefined })
      setDmInput('')
      setDmImageFile(null)
      setDmImagePreview(null)
      await loadDmMessages()
    } catch (err) {
      setFriendError(err.message || 'Failed to send')
    } finally {
      setDmSending(false)
    }
  }

  const handleDmImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setDmImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setDmImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const clearDmImage = () => {
    setDmImageFile(null)
    setDmImagePreview(null)
  }

  const startDmRecording = async () => {
    if (!token || !chatFriend) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      dmChunksRef.current = []
      recorder.ondataavailable = (ev) => ev.data.size > 0 && dmChunksRef.current.push(ev.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(dmChunksRef.current, { type: 'audio/webm' })
        if (blob.size > 0) {
          setDmSending(true)
          try {
            await sendDirectMessage(chatFriend.id, null, token, { voice: blob })
            await loadDmMessages()
          } catch (err) {
            setFriendError(err.message || 'Failed to send')
          } finally {
            setDmSending(false)
          }
        }
      }
      dmMediaRecorderRef.current = recorder
      recorder.start()
      setDmRecording(true)
    } catch (err) {
      console.error('Mic access denied:', err)
      setFriendError('Microphone access denied')
    }
  }

  const stopDmRecording = () => {
    if (dmMediaRecorderRef.current?.state === 'recording') {
      dmMediaRecorderRef.current.stop()
      setDmRecording(false)
    }
  }

  return (
    <div className="dashboard user-dashboard">
      <header className="dashboard-header">
        <Link to="/" className="logo-link">
          <Logo />
        </Link>
        <nav className="dashboard-nav">
          <button
            type="button"
            className={`nav-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-tab ${activeSection === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveSection('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={`nav-tab ${activeSection === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveSection('feed')}
          >
            Feed
          </button>
          <button
            type="button"
            className={`nav-tab ${activeSection === 'games' ? 'active' : ''}`}
            onClick={() => setActiveSection('games')}
          >
            Games
          </button>
          <button
            type="button"
            className={`nav-tab ${activeSection === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveSection('friends')}
          >
            Friends
          </button>
          <UserProfileDropdown label={user?.name || 'Profile'} type="user" onLogout={logout} />
        </nav>
      </header>

      <main className="dashboard-main">
        {activeSection === 'overview' && (
          <section className="dashboard-overview">
            <div className="welcome-card">
              <div className="welcome-avatar">{user?.name?.charAt(0)?.toUpperCase() || '?'}</div>
              <div className="welcome-text">
                <h1>Welcome back, {user?.name?.split(' ')[0] || 'Player'}!</h1>
                <p>Your gaming hub — chat with support, check the feed, and play.</p>
                <div className="welcome-badges">
                  <span className="verified-badge">✓ Verified</span>
                  <Link to="/user/settings" className="settings-link">Settings</Link>
                </div>
              </div>
            </div>

            <div className="overview-grid">
              <div className="profile-card-modern">
                <h2>Your Profile</h2>
                <div className="profile-fields">
                  <div className="profile-field">
                    <span className="label">Name</span>
                    <span className="value">{user?.name}</span>
                  </div>
                  <div className="profile-field">
                    <span className="label">Email</span>
                    <span className="value">{user?.email}</span>
                  </div>
                  <div className="profile-field">
                    <span className="label">Phone</span>
                    <span className="value">{user?.number}</span>
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <button type="button" className="action-btn" onClick={() => setActiveSection('chat')}>
                  <span className="action-icon">💬</span>
                  Chat with Support
                </button>
                <button type="button" className="action-btn" onClick={() => setActiveSection('feed')}>
                  <span className="action-icon">📰</span>
                  View Feed
                </button>
                <button type="button" className="action-btn" onClick={() => setActiveSection('games')}>
                  <span className="action-icon">🎮</span>
                  Play Games
                </button>
                <button type="button" className="action-btn" onClick={() => setActiveSection('friends')}>
                  <span className="action-icon">👥</span>
                  Friends
                </button>
                <Link to="/user/settings" className="action-btn action-btn-link">
                  <span className="action-icon">⚙️</span>
                  Account Settings
                </Link>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'chat' && (
          <section className="dashboard-chat-section">
            <div className="chat-unified-layout">
              <aside className="chat-conversation-list">
                <div className="chat-list-header">
                  <h3>Conversations</h3>
                </div>
                <div className="chat-conv-items">
                  <div
                    className={`chat-conv-item ${activeChat === 'support' ? 'active' : ''}`}
                    onClick={() => setActiveChat('support')}
                  >
                    <span className="chat-conv-avatar support"><Logo size="small" /></span>
                    <div className="chat-conv-info">
                      <span className="chat-conv-name">Winfinity Support</span>
                      <span className="chat-conv-hint">Chat with us</span>
                    </div>
                  </div>
                  {friends.length > 0 && (
                    <div className="chat-conv-divider">
                      <span>Friends</span>
                    </div>
                  )}
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className={`chat-conv-item ${activeChat === f.id ? 'active' : ''}`}
                      onClick={() => setActiveChat(f.id)}
                    >
                      <span className="chat-conv-avatar-wrap">
                        <span className="chat-conv-avatar">{f.name?.charAt(0)?.toUpperCase() || '?'}</span>
                        {f.isActive && <span className="chat-conv-active-dot" title="Active" />}
                      </span>
                      <div className="chat-conv-info">
                        <span className="chat-conv-name">{f.name}</span>
                        <span className={`chat-conv-hint ${f.isActive ? 'active' : ''}`}>
                          {f.isActive ? 'Active' : 'Direct message'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
              <div className="chat-panel">
                {activeChat === 'support' ? (
                  <ChatWithUs token={token} userName={user?.name} />
                ) : chatFriend ? (
                  <div className="friend-chat-panel">
                    <div className="friend-chat-header">
                      <span className="friend-chat-avatar">{chatFriend.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      <div className="friend-chat-header-info">
                        <span className="friend-chat-name">{chatFriend.name}</span>
                        <span className={`friend-chat-status ${chatFriend.isActive ? 'active' : ''}`}>
                          {chatFriend.isActive ? 'Active' : 'Friend'}
                        </span>
                      </div>
                    </div>
                    <div className="friend-chat-messages">
                      {dmMessages.length === 0 ? (
                        <div className="friend-chat-empty">
                          <span className="friend-chat-empty-icon">💬</span>
                          <p>No messages yet</p>
                          <span>Say hi to {chatFriend.name}!</span>
                        </div>
                      ) : (
                        dmMessages.map((m) => (
                          <div key={m.id} className={`dm-message ${m.isOwn ? 'own' : ''}`}>
                            {m.type === 'image' && m.attachmentUrl ? (
                              <>
                                <img src={m.attachmentUrl} alt="" />
                                {m.message && m.message !== '📷 Image' && <span className="dm-message-text">{m.message}</span>}
                              </>
                            ) : m.type === 'voice' && m.attachmentUrl ? (
                              <div className="dm-voice">
                                <VoiceMessagePlayer
                                  src={m.attachmentUrl}
                                  caption={m.message && m.message !== '🎤 Voice message' ? m.message : null}
                                  className="dm-voice-player"
                                />
                              </div>
                            ) : (
                              <span className="dm-message-text">{m.message}</span>
                            )}
                            <span className="dm-message-meta">
                              <span className="dm-message-time">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {m.isOwn && <MessageStatus status={m.status} />}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={dmMessagesEndRef} />
                    </div>
                    <form onSubmit={handleSendDm} className="friend-chat-input">
                      {dmImagePreview && (
                        <div className="friend-chat-image-preview">
                          <img src={dmImagePreview} alt="Preview" />
                          <button type="button" className="friend-chat-remove-image" onClick={clearDmImage} aria-label="Remove">×</button>
                        </div>
                      )}
                      <div className="friend-chat-input-row">
                        <label className="friend-chat-attach-btn" title="Send image">
                          <input type="file" accept="image/*" onChange={handleDmImageSelect} hidden />
                          📷
                        </label>
                        <input
                          type="text"
                          value={dmInput}
                          onChange={(e) => setDmInput(e.target.value)}
                          placeholder={`Message ${chatFriend.name}...`}
                          maxLength={500}
                        />
                        <button
                          type="button"
                          className={`friend-chat-voice-btn ${dmRecording ? 'recording' : ''}`}
                          title={dmRecording ? 'Stop recording' : 'Record voice message'}
                          onClick={() => (dmRecording ? stopDmRecording() : startDmRecording())}
                        >
                          {dmRecording ? '⏹' : '🎤'}
                        </button>
                        <button type="submit" disabled={dmSending || (!dmInput.trim() && !dmImageFile)} className="friend-chat-send-btn">
                          {dmSending ? '...' : 'Send'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="chat-select-prompt">
                    <span className="chat-select-icon">💬</span>
                    <p>Select a conversation</p>
                    <span>Choose Winfinity Support or a friend to start chatting</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'feed' && (
          <section className="dashboard-feed-section">
            <h2>Winfinity Feed</h2>
            <div className="feed-grid">
              {loading ? (
                <p className="feed-placeholder">Loading...</p>
              ) : feed.length === 0 ? (
                <p className="feed-placeholder">No posts yet.</p>
              ) : (
                feed.map((post) => (
                  <article key={post.id} className="feed-card">
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                    {post.imageUrl && <div className="feed-card-media"><img src={post.imageUrl} alt="" /></div>}
                    {post.videoUrl && (
                      <div className="feed-card-media">
                        <video src={post.videoUrl} controls />
                      </div>
                    )}
                    <time>{new Date(post.date).toLocaleDateString()}</time>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'games' && (
          <section className="dashboard-games-section">
            <h2>Games</h2>
            <GamesSection />
          </section>
        )}

        {activeSection === 'friends' && (
          <section className="dashboard-friends-section">
            <h2>Friends</h2>
            <p className="friends-desc">Add other verified users as friends. Search by name or email. They must accept your request.</p>
            {friendRequests.length > 0 && (
              <>
                <h3 className="friends-list-title">Friend Requests ({friendRequests.length})</h3>
                <div className="friend-requests-list">
                  {friendRequests.map((r) => (
                    <div key={r.id} className="friend-request-item">
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
                    </div>
                  ))}
                </div>
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
                    ) : u.requestReceived ? (
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
            {friendError && <p className="friends-error">{friendError}</p>}
            <h3 className="friends-list-title">Your Friends ({friends.length})</h3>
            {friends.length === 0 ? (
              <p className="no-friends">No friends yet. Search above to add users.</p>
            ) : (
              <ul className="friends-list dashboard-friends-list friends-only-list">
                {friends.map((f) => (
                  <li key={f.id} className="friend-item">
                    <span className="friend-avatar">{f.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    <span className="friend-name">{f.name}</span>
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
            {removeModal && (
              <div className="remove-modal-overlay" onClick={() => setRemoveModal(null)}>
                <div className="remove-modal" onClick={(e) => e.stopPropagation()}>
                  <h4>Remove friend?</h4>
                  <p>Are you sure you want to remove <strong>{removeModal.name}</strong> from your friends? They will no longer appear in your chat list.</p>
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
          </section>
        )}
      </main>
    </div>
  )
}

function UserDashboard() {
  const { user, loading, isAuthenticated, refreshUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  if (loading) {
    return (
      <div className="auth-page">
        <p className="auth-subtitle">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (!user?.verified) {
    return (
      <div className="auth-page">
        <Link to="/" className="back-link">← Back to Home</Link>
        <div className="auth-card user-card verification-gate">
          <Logo size="medium" />
          <h1>Complete your signup</h1>
          <p className="auth-subtitle">Verify your email to access your profile, chat, and feed.</p>
          <SignupForm initialEmail={user?.email} initialName={user?.name} />
          <p className="verification-refresh">
            Already verified? <button type="button" className="refresh-link" onClick={() => refreshUser()}>Refresh</button>
          </p>
        </div>
      </div>
    )
  }

  return <DashboardContent />
}

export default UserDashboard
