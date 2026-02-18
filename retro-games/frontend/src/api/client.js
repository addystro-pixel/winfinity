import { API_BASE } from '../config/api'

export async function submitSignup(data) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (e) {
    throw new Error('Server not reachable. Run "npm start" to start both frontend and backend.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json.error || (res.status === 404 ? 'API not found. Run "npm start" to start the backend.' : 'Signup failed')
    throw new Error(msg)
  }
  return json
}

export async function adminLogin(email, password) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch (e) {
    throw new Error('CONNECTION_ERROR')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Invalid email or password')
  return json
}

export async function getSignups(token) {
  const res = await fetch(`${API_BASE}/api/signups`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch signups')
  return res.json()
}

export async function getAdminMe(token) {
  const res = await fetch(`${API_BASE}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch admin')
  return res.json()
}

export async function getAdminStats(token) {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function getAdminFeed(token) {
  const res = await fetch(`${API_BASE}/api/admin/feed`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch feed')
  return res.json()
}

export async function createFeedPost(title, content, token, imageFile = null, videoFile = null) {
  const form = new FormData()
  form.append('title', title)
  form.append('content', content)
  if (imageFile) form.append('image', imageFile)
  if (videoFile) form.append('video', videoFile)
  const res = await fetch(`${API_BASE}/api/admin/feed`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to create post')
  return json
}

export async function updateFeedPost(id, title, content, token, imageFile = null, videoFile = null, clearImage = false, clearVideo = false) {
  const form = new FormData()
  form.append('title', title)
  form.append('content', content)
  if (clearImage) form.append('clearImage', 'true')
  if (clearVideo) form.append('clearVideo', 'true')
  if (imageFile) form.append('image', imageFile)
  if (videoFile) form.append('video', videoFile)
  const res = await fetch(`${API_BASE}/api/admin/feed/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update post')
  return json
}

export async function deleteFeedPost(id, token) {
  const res = await fetch(`${API_BASE}/api/admin/feed/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to delete post')
  return json
}

export async function getAdminMessages(token) {
  const res = await fetch(`${API_BASE}/api/admin/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

export async function getAdminConversation(userId, token) {
  const res = await fetch(`${API_BASE}/api/admin/conversation/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch conversation')
  return res.json()
}

export async function sendAdminReply(userId, message, token, { image, voice } = {}) {
  if (image || voice) {
    const formData = new FormData()
    formData.append('userId', String(userId))
    if (message) formData.append('message', message)
    if (image) formData.append('image', image)
    if (voice) formData.append('voice', voice, 'voice.webm')
    const res = await fetch(`${API_BASE}/api/admin/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed to send reply')
    return json
  }
  const res = await fetch(`${API_BASE}/api/admin/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, message }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to send reply')
  return json
}

export async function deleteSignup(id, token) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/signups/${Number(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (e) {
    throw new Error('Server not reachable. Make sure the backend is running on port 3002.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Delete failed (${res.status})`)
  return json
}

export async function verifySignup(id, token) {
  const res = await fetch(`${API_BASE}/api/admin/signups/${Number(id)}/verify`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Verify failed')
  return json
}

export async function verifyEmailToken(token) {
  const url = `${API_BASE}/api/verify?token=${encodeURIComponent(String(token || '').trim())}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ...data, success: false, status: 'invalid' }
  return data
}

export async function resendVerification(email) {
  const res = await fetch(`${API_BASE}/api/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Resend failed')
  return json
}

export async function userLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Invalid email or password')
  return json
}

export async function getUser(token) {
  const res = await fetch(`${API_BASE}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function sendMessage(message, token, { image, voice } = {}) {
  if (image || voice) {
    const formData = new FormData()
    if (message) formData.append('message', message)
    if (image) formData.append('image', image)
    if (voice) formData.append('voice', voice, 'voice.webm')
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed to send message')
    return json
  }
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to send message')
  return json
}

export async function getMessages(token) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

export async function getFeed() {
  const res = await fetch(`${API_BASE}/api/feed`)
  if (!res.ok) throw new Error('Failed to fetch feed')
  return res.json()
}

export async function getGames() {
  const res = await fetch(`${API_BASE}/api/games`)
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function getAdminGames(token) {
  const res = await fetch(`${API_BASE}/api/admin/games`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function createGame(name, link, token, logoFile = null) {
  if (logoFile) {
    const form = new FormData()
    form.append('name', name)
    if (link) form.append('link', link)
    form.append('logo', logoFile)
    const res = await fetch(`${API_BASE}/api/admin/games`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed to create game')
    return json
  }
  const res = await fetch(`${API_BASE}/api/admin/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, link: link || '' }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to create game')
  return json
}

export async function updateGame(id, name, link, token, { logoFile, clearLogo } = {}) {
  if (logoFile || clearLogo) {
    const form = new FormData()
    form.append('name', name)
    form.append('link', link || '')
    if (clearLogo) form.append('clearLogo', 'true')
    if (logoFile) form.append('logo', logoFile)
    const res = await fetch(`${API_BASE}/api/admin/games/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed to update game')
    return json
  }
  const res = await fetch(`${API_BASE}/api/admin/games/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, link: link || '' }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update game')
  return json
}

export async function deleteGame(id, token) {
  const res = await fetch(`${API_BASE}/api/admin/games/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to delete game')
  return json
}

export async function getFriends(token) {
  const res = await fetch(`${API_BASE}/api/friends`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch friends')
  return res.json()
}

export async function searchUsers(query, token) {
  const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to search users')
  return res.json()
}

export async function sendFriendRequest(friendId, token) {
  const res = await fetch(`${API_BASE}/api/friends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to send request')
  return json
}

export async function getFriendRequests(token) {
  const res = await fetch(`${API_BASE}/api/friend-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch requests')
  return res.json()
}

export async function acceptFriendRequest(requestId, token) {
  const res = await fetch(`${API_BASE}/api/friend-requests/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to accept')
  return json
}

export async function rejectFriendRequest(requestId, token) {
  const res = await fetch(`${API_BASE}/api/friend-requests/${requestId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to reject')
  return json
}

export async function removeFriend(friendId, token) {
  const res = await fetch(`${API_BASE}/api/friends/${friendId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to remove friend')
  return json
}

export async function getDirectMessages(friendId, token) {
  const res = await fetch(`${API_BASE}/api/direct-messages/${friendId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to load messages')
  return res.json()
}

export async function sendDirectMessage(friendId, message, token, { image, voice } = {}) {
  if (image || voice) {
    const form = new FormData()
    form.append('message', message || '')
    if (image) form.append('image', image)
    if (voice) form.append('voice', voice, 'voice.webm')
    const res = await fetch(`${API_BASE}/api/direct-messages/${friendId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed to send')
    return json
  }
  const res = await fetch(`${API_BASE}/api/direct-messages/${friendId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to send')
  return json
}

export async function getAdminAdmins(token) {
  const res = await fetch(`${API_BASE}/api/admin/admins`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch admins')
  return res.json()
}

export async function getAdminFriends(token) {
  const res = await fetch(`${API_BASE}/api/admin/friends`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch friends')
  return res.json()
}

export async function createAdmin(email, name, password, permissions, token) {
  const res = await fetch(`${API_BASE}/api/admin/admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, name, password, permissions }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to create admin')
  return json
}

export async function addAdminFriend(friendAdminId, token) {
  const res = await fetch(`${API_BASE}/api/admin/friends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendAdminId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to add friend')
  return json
}
