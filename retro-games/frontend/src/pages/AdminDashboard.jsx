import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import UserProfileDropdown from '../components/UserProfileDropdown'
import VoiceMessagePlayer from '../components/VoiceMessagePlayer'
import MessageStatus from '../components/MessageStatus'
import {
  getSignups,
  deleteSignup,
  verifySignup,
  getAdminAdmins,
  createAdmin,
  getAdminMe,
  getAdminConversation,
  sendAdminReply,
  getAdminStats,
  getAdminFeed,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  getAdminGames,
  createGame,
  updateGame,
  deleteGame,
} from '../api/client'
import { ADMIN_TOKEN_KEY } from './AdminLogin'
import './Dashboard.css'
import './AdminDashboard.css'

function AdminOverview({ token, onUnauthorized }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError('')
    getAdminStats(token)
      .then((data) => { setStats(data); setError('') })
      .catch((err) => {
        setStats(null)
        if (err.message === 'UNAUTHORIZED') {
          onUnauthorized?.()
        } else {
          setError(err.message || 'Failed to load stats')
        }
      })
      .finally(() => setLoading(false))
  }, [token, onUnauthorized])

  useEffect(() => { loadStats() }, [loadStats])

  if (loading) return <p className="admin-loading">Loading...</p>
  if (!stats) {
    return (
      <section className="admin-overview">
        <h2>Overview</h2>
        <p className="admin-error">{error || 'Failed to load stats'}</p>
        {error && error !== 'UNAUTHORIZED' && (
          <button type="button" className="retry-btn" onClick={loadStats}>Retry</button>
        )}
      </section>
    )
  }

  return (
    <section className="admin-overview">
      <h2>Overview</h2>
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="stat-value">{stats.totalUsers}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="admin-stat-card success">
          <span className="stat-value">{stats.verifiedUsers}</span>
          <span className="stat-label">Verified</span>
        </div>
        <div className="admin-stat-card warning">
          <span className="stat-value">{stats.pendingVerification}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{stats.totalMessages}</span>
          <span className="stat-label">Messages</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{stats.totalFeedPosts}</span>
          <span className="stat-label">Feed Posts</span>
        </div>
      </div>
      <div className="admin-recent">
        <h3>Recent Signups</h3>
        {stats.recentSignups?.length === 0 ? (
          <p className="no-data">No signups yet.</p>
        ) : (
          <ul className="recent-list">
            {stats.recentSignups?.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <span className={s.verified ? 'badge success' : 'badge pending'}>{s.verified ? 'Verified' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function AdminUsers({ token, signups, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [verifying, setVerifying] = useState(null)
  const navigate = useNavigate()

  const loadSignups = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await getSignups(token)
      onRefresh(data)
    } catch {
      setError('Failed to load')
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      navigate('/login/admin')
    } finally {
      setLoading(false)
    }
  }, [token, navigate, onRefresh])

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteSignup(deleteTarget.id, token)
      onRefresh(signups.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleVerify = async (s) => {
    if (!token || s.verified) return
    setVerifying(s.id)
    try {
      await verifySignup(s.id, token)
      onRefresh(signups.map((u) => (u.id === s.id ? { ...u, verified: true } : u)))
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(null)
    }
  }

  return (
    <section className="admin-users-section">
      <div className="section-header">
        <h2>Users</h2>
        <button type="button" onClick={loadSignups} className="refresh-btn" disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <p className="signup-error">{error}</p>}
      {!loading && signups.length === 0 ? (
        <p className="no-signups">No signups yet.</p>
      ) : (
        <div className="signups-table-wrapper">
          <table className="signups-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Verified</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.number}</td>
                  <td><span className={`verified-cell ${s.verified ? 'yes' : 'no'}`}>{s.verified ? 'Done' : 'Pending'}</span></td>
                  <td>{s.date ? new Date(s.date).toLocaleString() : '-'}</td>
                  <td>
                    {!s.verified && (
                      <button type="button" className="verify-btn" onClick={() => handleVerify(s)} disabled={verifying === s.id}>
                        {verifying === s.id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    <button type="button" className="delete-btn" onClick={() => setDeleteTarget(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {deleteTarget && (
        <div className="delete-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete user?</h3>
            <p className="delete-modal-user">{deleteTarget.name} ({deleteTarget.email})</p>
            <p className="delete-modal-warn">This cannot be undone.</p>
            <div className="delete-modal-actions">
              <button type="button" className="delete-modal-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="delete-modal-confirm" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AdminChat({ token, signups }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [conversation, setConversation] = useState([])
  const [replyInput, setReplyInput] = useState('')
  const [replyImage, setReplyImage] = useState(null)
  const [replyImagePreview, setReplyImagePreview] = useState(null)
  const [recording, setRecording] = useState(false)
  const [convLoading, setConvLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const messagesEndRef = useRef(null)

  const loadConversation = useCallback(async () => {
    if (!token || !selectedUser) return
    setConvLoading(true)
    try {
      const data = await getAdminConversation(selectedUser.id, token)
      setConversation(data)
    } catch {
      setConversation([])
    } finally {
      setConvLoading(false)
    }
  }, [token, selectedUser])

  useEffect(() => {
    if (selectedUser && token) {
      loadConversation()
      const interval = setInterval(loadConversation, 4000)
      return () => clearInterval(interval)
    } else setConversation([])
  }, [selectedUser, token, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSendReply = async (e) => {
    e.preventDefault()
    if ((!replyInput.trim() && !replyImage) || !token || !selectedUser) return
    setSending(true)
    try {
      await sendAdminReply(selectedUser.id, replyInput.trim() || null, token, { image: replyImage || undefined })
      setReplyInput('')
      setReplyImage(null)
      setReplyImagePreview(null)
      await loadConversation()
    } finally {
      setSending(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith('image/')) return
    setReplyImage(file)
    const reader = new FileReader()
    reader.onload = () => setReplyImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size > 0 && token && selectedUser) {
          setSending(true)
          try {
            await sendAdminReply(selectedUser.id, null, token, { voice: blob })
            await loadConversation()
          } finally {
            setSending(false)
          }
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {}
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  return (
    <section className="admin-chat-section">
      <h2>Support Chat</h2>
      <div className="profiles-layout">
        <div className="profiles-sidebar">
          <h3>Users</h3>
          <div className="profiles-list">
            {signups.length === 0 ? (
              <p className="profiles-empty">No users yet.</p>
            ) : (
              signups.map((u) => (
                <button key={u.id} type="button" className={`profile-item ${selectedUser?.id === u.id ? 'active' : ''}`} onClick={() => setSelectedUser(u)}>
                  <span className="profile-item-avatar-wrap">
                    <span className="profile-item-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    {u.isActive && <span className="profile-item-active-dot" title="Active" />}
                  </span>
                  <div className="profile-item-info">
                    <span className="profile-item-name">{u.name}</span>
                    <span className="profile-item-email">{u.email}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="profiles-chat">
          {!selectedUser ? (
            <div className="profiles-chat-empty"><p>Select a user to chat</p></div>
          ) : (
            <>
              <div className="profiles-chat-header">
                <span className="profiles-chat-avatar-wrap">
                  <span className="profiles-chat-avatar">{selectedUser.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  {selectedUser.isActive && <span className="profiles-chat-active-dot" title="Active" />}
                </span>
                <div>
                  <h3>{selectedUser.name}</h3>
                  <span className="profiles-chat-email">{selectedUser.email}</span>
                  {selectedUser.isActive && <span className="profiles-chat-active-badge">Active</span>}
                </div>
              </div>
              <div className="profiles-chat-messages">
                {convLoading && conversation.length === 0 ? <p className="profiles-chat-loading">Loading...</p> : conversation.length === 0 ? <p className="profiles-chat-no-msgs">No messages yet.</p> : conversation.map((m) => (
                  <div key={m.id} className={`profiles-msg ${m.senderType === 'support' ? 'from-support' : 'from-user'}`}>
                    <div className="profiles-msg-meta">
                      <span className="profiles-msg-sender">{m.senderName}</span>
                      <span className="profiles-msg-time">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.senderType === 'support' && <MessageStatus status={m.status} />}
                    </div>
                    {m.type === 'image' && m.attachmentUrl ? <><img src={m.attachmentUrl} alt="" className="profiles-msg-img" />{m.message && m.message !== '📷 Image' && <p>{m.message}</p>}</> : m.type === 'voice' && m.attachmentUrl ? <><VoiceMessagePlayer src={m.attachmentUrl} caption={m.message && m.message !== '🎤 Voice message' ? m.message : null} className="profiles-msg-voice" /></> : <p>{m.message}</p>}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendReply} className="profiles-chat-input">
                {replyImagePreview && <div className="profiles-reply-preview"><img src={replyImagePreview} alt="" /><button type="button" className="profiles-remove-preview" onClick={() => { setReplyImage(null); setReplyImagePreview(null) }}>×</button></div>}
                <div className="profiles-chat-input-row">
                  <label className="profiles-attach-btn"><input type="file" accept="image/*" onChange={handleImageSelect} hidden />📷</label>
                  <input type="text" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} placeholder="Type a reply..." maxLength={500} />
                  <button type="button" className={`profiles-voice-btn ${recording ? 'recording' : ''}`} onClick={() => (recording ? stopRecording() : startRecording())}>{recording ? '⏹' : '🎤'}</button>
                  <button type="submit" disabled={sending || (!replyInput.trim() && !replyImage)}>{sending ? '...' : 'Send'}</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function AdminFeedManager({ token }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newImage, setNewImage] = useState(null)
  const [newVideo, setNewVideo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadPosts = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getAdminFeed(token)
      setPosts(data)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !token) return
    setSaving(true)
    try {
      await createFeedPost(newTitle.trim(), newContent.trim(), token, newImage || undefined, newVideo || undefined)
      setNewTitle('')
      setNewContent('')
      setNewImage(null)
      setNewVideo(null)
      setShowForm(false)
      await loadPosts()
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editing || !token) return
    setSaving(true)
    try {
      await updateFeedPost(
        editing.id,
        editing.title,
        editing.content,
        token,
        editing.imageFile || undefined,
        editing.videoFile || undefined,
        editing.clearImage,
        editing.clearVideo
      )
      setEditing(null)
      await loadPosts()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!token || !confirm('Delete this post?')) return
    try {
      await deleteFeedPost(id, token)
      await loadPosts()
    } catch {}
  }

  const resetCreateForm = () => {
    setShowForm(false)
    setNewTitle('')
    setNewContent('')
    setNewImage(null)
    setNewVideo(null)
  }

  return (
    <section className="admin-feed-section">
      <div className="section-header">
        <h2>Feed Manager</h2>
        <button type="button" className="add-post-btn" onClick={() => setShowForm(true)}>+ New Post</button>
      </div>
      <p className="feed-manager-desc">Manage the Winfinity feed that users see. Add images and videos to posts.</p>
      {showForm && (
        <form onSubmit={handleCreate} className="feed-form">
          <input type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          <textarea placeholder="Content" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={3} />
          <div className="feed-media-upload">
            <label className="feed-upload-label">
              <span>📷 Add Image</span>
              <input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} hidden />
              {newImage && <span className="feed-file-name">{newImage.name}</span>}
            </label>
            <label className="feed-upload-label">
              <span>🎬 Add Video</span>
              <input type="file" accept="video/*" onChange={(e) => setNewVideo(e.target.files?.[0] || null)} hidden />
              {newVideo && <span className="feed-file-name">{newVideo.name}</span>}
            </label>
          </div>
          <div className="feed-form-actions">
            <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={resetCreateForm}>Cancel</button>
          </div>
        </form>
      )}
      {loading ? <p className="admin-loading">Loading...</p> : posts.length === 0 ? <p className="no-data">No posts yet.</p> : (
        <div className="feed-posts-list">
          {posts.map((p) => (
            <div key={p.id} className="feed-post-card">
              {editing?.id === p.id ? (
                <form onSubmit={handleUpdate} className="feed-edit-form">
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={2} />
                  <div className="feed-media-upload">
                    <label className="feed-upload-label">
                      <span>📷 {editing.imageUrl || editing.imageFile ? 'Change' : 'Add'} Image</span>
                      <input type="file" accept="image/*" onChange={(e) => setEditing({ ...editing, imageFile: e.target.files?.[0] || null })} hidden />
                      {(editing.imageUrl || editing.imageFile) && (
                        <button type="button" className="feed-clear-media" onClick={() => setEditing({ ...editing, clearImage: true, imageFile: null })}>Remove</button>
                      )}
                    </label>
                    <label className="feed-upload-label">
                      <span>🎬 {editing.videoUrl || editing.videoFile ? 'Change' : 'Add'} Video</span>
                      <input type="file" accept="video/*" onChange={(e) => setEditing({ ...editing, videoFile: e.target.files?.[0] || null })} hidden />
                      {(editing.videoUrl || editing.videoFile) && (
                        <button type="button" className="feed-clear-media" onClick={() => setEditing({ ...editing, clearVideo: true, videoFile: null })}>Remove</button>
                      )}
                    </label>
                  </div>
                  <div className="feed-form-actions">
                    <button type="submit" disabled={saving}>Save</button>
                    <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <h4>{p.title}</h4>
                  <p>{p.content}</p>
                  {p.imageUrl && <div className="feed-post-media"><img src={p.imageUrl} alt="" /></div>}
                  {p.videoUrl && (
                    <div className="feed-post-media">
                      <video src={p.videoUrl} controls />
                    </div>
                  )}
                  <span className="feed-post-date">{new Date(p.date).toLocaleDateString()}</span>
                  <div className="feed-post-actions">
                    <button type="button" onClick={() => setEditing({ id: p.id, title: p.title, content: p.content, imageUrl: p.imageUrl, videoUrl: p.videoUrl })}>Edit</button>
                    <button type="button" className="delete-btn" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AdminGamesManager({ token }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newName, setNewName] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newLogo, setNewLogo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadGames = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getAdminGames(token)
      setGames(data)
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !token) return
    setSaving(true)
    try {
      await createGame(newName.trim(), newLink.trim() || null, token, newLogo || undefined)
      setNewName('')
      setNewLink('')
      setNewLogo(null)
      setShowForm(false)
      await loadGames()
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editing || !token) return
    setSaving(true)
    try {
      await updateGame(
        editing.id,
        editing.name,
        editing.link || null,
        token,
        { logoFile: editing.logoFile, clearLogo: editing.clearLogo }
      )
      setEditing(null)
      await loadGames()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!token || !confirm('Remove this game?')) return
    try {
      await deleteGame(id, token)
      await loadGames()
    } catch {}
  }

  const resetCreateForm = () => {
    setShowForm(false)
    setNewName('')
    setNewLink('')
    setNewLogo(null)
  }

  return (
    <section className="admin-games-section">
      <div className="section-header">
        <h2>Games Manager</h2>
        <button type="button" className="add-post-btn" onClick={() => setShowForm(true)}>+ Add Game</button>
      </div>
      <p className="games-manager-desc">Add, edit, or remove games. Each game can have a name, link, and logo.</p>
      {showForm && (
        <form onSubmit={handleCreate} className="feed-form games-form">
          <input type="text" placeholder="Game name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input type="url" placeholder="Game link (URL)" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
          <div className="feed-media-upload">
            <label className="feed-upload-label">
              <span>🖼️ Add logo</span>
              <input type="file" accept="image/*" onChange={(e) => setNewLogo(e.target.files?.[0] || null)} hidden />
              {newLogo && <span className="feed-file-name">{newLogo.name}</span>}
            </label>
          </div>
          <div className="feed-form-actions">
            <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Game'}</button>
            <button type="button" onClick={resetCreateForm}>Cancel</button>
          </div>
        </form>
      )}
      {loading ? <p className="admin-loading">Loading...</p> : games.length === 0 ? <p className="no-data">No games yet. Add your first game.</p> : (
        <div className="games-manager-list">
          {games.map((g) => (
            <div key={g.id} className="game-manager-card">
              {editing?.id === g.id ? (
                <form onSubmit={handleUpdate} className="feed-edit-form games-edit-form">
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Game name" />
                  <input value={editing.link || ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="Game link (URL)" type="url" />
                  <div className="feed-media-upload">
                    <label className="feed-upload-label">
                      <span>🖼️ {editing.logoUrl || editing.logoFile ? 'Change' : 'Add'} logo</span>
                      <input type="file" accept="image/*" onChange={(e) => setEditing({ ...editing, logoFile: e.target.files?.[0] || null })} hidden />
                      {(editing.logoUrl || editing.logoFile) && (
                        <button type="button" className="feed-clear-media" onClick={() => setEditing({ ...editing, clearLogo: true, logoFile: null })}>Remove logo</button>
                      )}
                    </label>
                  </div>
                  <div className="feed-form-actions">
                    <button type="submit" disabled={saving}>Save</button>
                    <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="game-manager-preview">
                    {g.logoUrl ? (
                      <img src={g.logoUrl} alt="" className="game-manager-logo" />
                    ) : (
                      <div className="game-manager-icon">{g.name?.charAt(0) || '?'}</div>
                    )}
                    <div className="game-manager-info">
                      <h4>{g.name}</h4>
                      {g.link && <a href={g.link} target="_blank" rel="noopener noreferrer" className="game-manager-link">{g.link}</a>}
                    </div>
                  </div>
                  <div className="feed-post-actions">
                    <button type="button" onClick={() => setEditing({ id: g.id, name: g.name, link: g.link, logoUrl: g.logoUrl })}>Edit</button>
                    <button type="button" className="delete-btn" onClick={() => handleDelete(g.id)}>Remove</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const PERM_LABELS = { users: 'Users', chat: 'Chat', feed: 'Feed Manager', games: 'Games', admins: 'Manage Admins', settings: 'Settings' }

function AdminAdmins({ token, isSuper }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPerms, setFormPerms] = useState({ users: true, chat: true, feed: false, games: false, admins: false, settings: false })
  const [creating, setCreating] = useState(false)

  const loadAdmins = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await getAdminAdmins(token)
      setAdmins(data)
    } catch (err) {
      setError(err.message || 'Failed to load')
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadAdmins() }, [loadAdmins])

  const togglePerm = (key) => {
    if (key === 'admins') return
    setFormPerms((p) => ({ ...p, [key]: !p[key] }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!isSuper || !token || !formEmail.trim() || !formName.trim() || !formPassword) return
    if (formPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setCreating(true)
    setError('')
    try {
      await createAdmin(formEmail.trim(), formName.trim(), formPassword, formPerms, token)
      setFormEmail('')
      setFormName('')
      setFormPassword('')
      setFormPerms({ users: true, chat: true, feed: false, games: false, admins: false, settings: false })
      setShowForm(false)
      await loadAdmins()
    } catch (err) {
      setError(err.message || 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="admin-admins-section">
      <div className="section-header">
        <h2>Admins</h2>
        {isSuper && (
          <button type="button" className="add-post-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Admin'}
          </button>
        )}
      </div>
      {error && <p className="admin-error">{error}</p>}
      {isSuper && showForm && (
        <form onSubmit={handleCreate} className="admin-create-form">
          <div className="admin-form-row">
            <input type="email" placeholder="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            <input type="text" placeholder="Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <input type="password" placeholder="Password (min 6)" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="admin-perms-row">
            <span className="admin-perms-label">Permissions:</span>
            {['users', 'chat', 'feed', 'games', 'settings'].map((key) => (
              <label key={key} className="admin-perm-check">
                <input type="checkbox" checked={!!formPerms[key]} onChange={() => togglePerm(key)} />
                {PERM_LABELS[key]}
              </label>
            ))}
          </div>
          <button type="submit" className="add-post-btn" disabled={creating}>{creating ? 'Creating...' : 'Create Admin'}</button>
        </form>
      )}
      {loading ? (
        <p className="admin-loading">Loading...</p>
      ) : (
        <div className="admin-list">
          {admins.map((a) => (
            <div key={a.id} className="admin-list-item">
              <div>
                <strong>{a.name}</strong> ({a.email})
                <span className={`admin-role-badge ${a.role === 'super' ? 'super' : ''}`}>{a.role === 'super' ? 'Super Admin' : 'Admin'}</span>
              </div>
              {a.permissions && (
                <span className="admin-perms-hint">
                  {Object.entries(a.permissions).filter(([, v]) => v).map(([k]) => PERM_LABELS[k] || k).join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminData, setAdminData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('winfinity_admin_data') || '{}')
    } catch {
      return {}
    }
  })
  const navigate = useNavigate()
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)

  useEffect(() => {
    if (!token) {
      navigate('/login/admin')
      return
    }
    getSignups(token).then(setSignups).catch(() => setSignups([])).finally(() => setLoading(false))
  }, [token, navigate])

  useEffect(() => {
    if (!token) return
    const stored = sessionStorage.getItem('winfinity_admin_data')
    if (stored) return
    getAdminMe(token)?.then(({ role, permissions }) => {
      const data = { role, permissions }
      sessionStorage.setItem('winfinity_admin_data', JSON.stringify(data))
      setAdminData(data)
    }).catch(() => {})
  }, [token])

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem('winfinity_admin_data')
    navigate('/')
  }
  const isSuper = adminData.role === 'super'
  const perms = adminData.permissions || {}

  const can = (key) => isSuper || !!perms[key]

  const sections = [
    can('users') && 'overview',
    can('users') && 'users',
    can('chat') && 'chat',
    can('feed') && 'feed',
    can('games') && 'games',
    can('admins') && 'admins',
  ].filter(Boolean)
  const firstSection = sections[0] || 'overview'

  useEffect(() => {
    if (sections.length && !sections.includes(activeSection)) {
      setActiveSection(firstSection)
    }
  }, [sections.length, activeSection, firstSection])

  if (!token) return null

  return (
    <div className="dashboard admin-dashboard">
      <header className="dashboard-header">
        <Link to="/" className="logo-link"><Logo /></Link>
        <nav>
          <UserProfileDropdown label={isSuper ? 'Super Admin' : 'Admin'} type="admin" onLogout={handleLogout} />
        </nav>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            {can('users') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>
                <span className="nav-icon">📊</span> Overview
              </button>
            )}
            {can('users') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>
                <span className="nav-icon">👥</span> Users
              </button>
            )}
            {can('chat') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'chat' ? 'active' : ''}`} onClick={() => setActiveSection('chat')}>
                <span className="nav-icon">💬</span> Chat
              </button>
            )}
            {can('feed') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'feed' ? 'active' : ''}`} onClick={() => setActiveSection('feed')}>
                <span className="nav-icon">📰</span> Feed Manager
              </button>
            )}
            {can('games') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'games' ? 'active' : ''}`} onClick={() => setActiveSection('games')}>
                <span className="nav-icon">🎮</span> Games
              </button>
            )}
            {can('admins') && (
              <button type="button" className={`admin-nav-item ${activeSection === 'admins' ? 'active' : ''}`} onClick={() => setActiveSection('admins')}>
                <span className="nav-icon">👑</span> Admins
              </button>
            )}
            {can('settings') && (
              <Link to="/admin/settings" className="admin-nav-item">
                <span className="nav-icon">⚙️</span> Settings
              </Link>
            )}
          </nav>
        </aside>
        <main className="admin-content">
          {activeSection === 'overview' && can('users') && <AdminOverview token={token} onUnauthorized={() => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/login/admin') }} />}
          {activeSection === 'users' && can('users') && <AdminUsers token={token} signups={signups} onRefresh={setSignups} />}
          {activeSection === 'chat' && can('chat') && <AdminChat token={token} signups={signups} />}
          {activeSection === 'feed' && can('feed') && <AdminFeedManager token={token} />}
          {activeSection === 'games' && can('games') && <AdminGamesManager token={token} />}
          {activeSection === 'admins' && can('admins') && <AdminAdmins token={token} isSuper={isSuper} />}
          {activeSection === 'overview' && can('users') && (
            <AdminOverview token={token} onUnauthorized={() => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/login/admin') }} />
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
