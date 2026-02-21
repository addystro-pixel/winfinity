/**
 * PostgreSQL database adapter for Supabase.
 * Used when DATABASE_URL is set.
 */
import pg from 'pg'
import crypto from 'crypto'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(pwd, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

const ACTIVE_THRESHOLD_MINUTES = 5

function isActive(lastActive) {
  if (!lastActive) return false
  const diff = (Date.now() - new Date(lastActive).getTime()) / 60000
  return diff <= ACTIVE_THRESHOLD_MINUTES
}

export async function updateUserActive(userId) {
  if (!userId) return
  await pool.query('UPDATE signups SET last_active = NOW() WHERE id = $1', [userId])
}

export async function isUserActive(userId) {
  const r = await pool.query('SELECT last_active FROM signups WHERE id = $1', [userId])
  return isActive(r.rows[0]?.last_active)
}

export async function getAllSignups() {
  const r = await pool.query(`
    SELECT id, name, email, number, date, verified, verification_token, last_active, COALESCE(login_count, 0) as login_count
    FROM signups ORDER BY id DESC
  `)
  return r.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    number: row.number,
    date: row.date,
    verified: !!row.verified,
    verificationToken: row.verification_token,
    isActive: isActive(row.last_active),
    loginCount: row.login_count ?? 0,
  }))
}

export async function createSignup({ name, email, number, numberHash, passwordHash, verified = false, verificationToken, tokenExpires }) {
  const r = await pool.query(`
    INSERT INTO signups (name, email, number, number_hash, password_hash, date, verified, verification_token, token_expires)
    VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
    RETURNING id
  `, [name, email, number, numberHash || null, passwordHash || null, verified ? 1 : 0, verificationToken || null, tokenExpires || null])
  return r.rows[0].id
}

export async function getSignupByToken(token) {
  const r = await pool.query('SELECT * FROM signups WHERE verification_token = $1', [token])
  return r.rows[0] || null
}

export async function getSignupByEmail(email) {
  const r = await pool.query(`
    SELECT * FROM signups WHERE LOWER(email) = LOWER($1)
    ORDER BY id DESC LIMIT 1
  `, [email])
  return r.rows[0] || null
}

export async function getSignupById(id) {
  const r = await pool.query('SELECT * FROM signups WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function updateVerificationToken(id, token, tokenExpires, passwordHash) {
  if (passwordHash) {
    await pool.query(`
      UPDATE signups SET verification_token = $1, token_expires = $2, password_hash = $3 WHERE id = $4
    `, [token, tokenExpires, passwordHash, id])
  } else {
    await pool.query(`
      UPDATE signups SET verification_token = $1, token_expires = $2 WHERE id = $3
    `, [token, tokenExpires, id])
  }
}

export async function markSignupVerified(id) {
  await pool.query(`
    UPDATE signups SET verified = 1, verification_token = NULL WHERE id = $1
  `, [id])
}

export async function updateSignupToVerified(id, passwordHash) {
  await pool.query(`
    UPDATE signups SET verified = 1, verification_token = NULL, token_expires = NULL, password_hash = $1 WHERE id = $2
  `, [passwordHash, id])
}

export async function incrementLoginCount(userId) {
  await pool.query(`
    UPDATE signups SET login_count = COALESCE(login_count, 0) + 1 WHERE id = $1
  `, [userId])
}

export async function deleteSignup(id) {
  await pool.query('DELETE FROM messages WHERE user_id = $1', [id])
  const r = await pool.query('DELETE FROM signups WHERE id = $1', [id])
  return { changes: r.rowCount || 0 }
}

export async function addMessage(userId, message, type = 'text', attachmentPath = null, senderType = 'user') {
  const r = await pool.query(`
    INSERT INTO messages (user_id, message, date, type, attachment_path, sender_type, status)
    VALUES ($1, $2, NOW(), $3, $4, $5, 'sent')
    RETURNING id
  `, [userId, message || '', type, attachmentPath, senderType])
  return r.rows[0].id
}

async function markSupportMessagesAsSeen(userId) {
  await pool.query(`
    UPDATE messages SET status = 'seen' WHERE user_id = $1 AND sender_type = 'support' AND (status IS NULL OR status != 'seen')
  `, [userId])
}

async function markUserMessagesAsSeen(userId) {
  await pool.query(`
    UPDATE messages SET status = 'seen' WHERE user_id = $1 AND sender_type = 'user' AND (status IS NULL OR status != 'seen')
  `, [userId])
}

export async function getMessagesByUser(userId) {
  await markSupportMessagesAsSeen(userId)
  const r = await pool.query(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, m.status, s.name
    FROM messages m
    JOIN signups s ON s.id = m.user_id
    WHERE m.user_id = $1 ORDER BY m.date ASC
  `, [userId])
  return r.rows
}

export async function getMessagesForUser(userId) {
  await markUserMessagesAsSeen(userId)
  const r = await pool.query(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, m.status
    FROM messages m
    WHERE m.user_id = $1 ORDER BY m.date ASC
  `, [userId])
  const user = await getSignupById(userId)
  return r.rows.map(row => ({
    ...row,
    userName: user?.name,
    userEmail: user?.email,
    senderName: row.sender_type === 'support' ? 'Winfinity Support' : (user?.name || 'User'),
  }))
}

export async function getAllMessages() {
  const r = await pool.query(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, s.name, s.email
    FROM messages m
    JOIN signups s ON s.id = m.user_id
    ORDER BY m.date DESC
  `)
  return r.rows
}

export async function getFeedPosts() {
  const r = await pool.query(`
    SELECT * FROM feed_posts ORDER BY date DESC LIMIT 20
  `)
  return r.rows
}

export async function createFeedPost(title, content, imageUrl = null, videoUrl = null) {
  const r = await pool.query(`
    INSERT INTO feed_posts (title, content, image_url, video_url, date) VALUES ($1, $2, $3, $4, NOW())
    RETURNING id
  `, [title, content, imageUrl, videoUrl])
  return r.rows[0].id
}

export async function updateFeedPost(id, title, content, imageUrl = undefined, videoUrl = undefined) {
  const existing = await getFeedPostById(id)
  if (!existing) return
  const img = imageUrl !== undefined ? imageUrl : (existing.image_url || null)
  const vid = videoUrl !== undefined ? videoUrl : (existing.video_url || null)
  await pool.query(`
    UPDATE feed_posts SET title = $1, content = $2, image_url = $3, video_url = $4, date = NOW() WHERE id = $5
  `, [title, content, img, vid, id])
}

export async function deleteFeedPost(id) {
  const r = await pool.query('DELETE FROM feed_posts WHERE id = $1', [id])
  return { changes: r.rowCount || 0 }
}

export async function getFeedPostById(id) {
  const r = await pool.query('SELECT * FROM feed_posts WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function getAdminStats() {
  const [totalUsers, verifiedUsers, totalMessages, totalFeedPosts, recentSignups] = await Promise.all([
    pool.query('SELECT COUNT(*) as c FROM signups'),
    pool.query('SELECT COUNT(*) as c FROM signups WHERE verified = 1'),
    pool.query('SELECT COUNT(*) as c FROM messages'),
    pool.query('SELECT COUNT(*) as c FROM feed_posts'),
    pool.query('SELECT id, name, email, verified, date FROM signups ORDER BY date DESC LIMIT 5'),
  ])
  return {
    totalUsers: parseInt(totalUsers.rows[0].c, 10),
    verifiedUsers: parseInt(verifiedUsers.rows[0].c, 10),
    pendingVerification: parseInt(totalUsers.rows[0].c, 10) - parseInt(verifiedUsers.rows[0].c, 10),
    totalMessages: parseInt(totalMessages.rows[0].c, 10),
    totalFeedPosts: parseInt(totalFeedPosts.rows[0].c, 10),
    recentSignups: recentSignups.rows.map(s => ({ ...s, verified: !!s.verified })),
  }
}

export async function getAdminByEmail(email) {
  const r = await pool.query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [email])
  return r.rows[0] || null
}

export async function getAdminById(id) {
  const r = await pool.query('SELECT * FROM admins WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function getAllAdmins() {
  const r = await pool.query('SELECT id, email, name, date, role, permissions, created_by FROM admins ORDER BY name')
  return r.rows.map(row => ({
    ...row,
    permissions: row.permissions ? JSON.parse(row.permissions) : null,
  }))
}

export async function createAdmin({ email, name, passwordHash, role = 'admin', permissions, createdBy }) {
  const perms = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || {})
  const r = await pool.query(`
    INSERT INTO admins (email, name, password_hash, date, role, permissions, created_by)
    VALUES ($1, $2, $3, NOW(), $4, $5, $6)
    RETURNING id
  `, [email, name, passwordHash, role, perms, createdBy || null])
  return r.rows[0].id
}

export async function getAdminFriends(adminId) {
  const r = await pool.query(`
    SELECT a.id, a.email, a.name FROM admin_friends f
    JOIN admins a ON a.id = f.friend_admin_id
    WHERE f.admin_id = $1
  `, [adminId])
  return r.rows
}

export async function addAdminFriend(adminId, friendAdminId) {
  if (adminId === friendAdminId) return false
  try {
    await pool.query('INSERT INTO admin_friends (admin_id, friend_admin_id) VALUES ($1, $2)', [adminId, friendAdminId])
    await pool.query('INSERT INTO admin_friends (admin_id, friend_admin_id) VALUES ($1, $2)', [friendAdminId, adminId])
    return true
  } catch {
    return false
  }
}

export async function areAdminFriends(adminId, friendAdminId) {
  const r = await pool.query('SELECT 1 FROM admin_friends WHERE admin_id = $1 AND friend_admin_id = $2', [adminId, friendAdminId])
  return !!r.rows[0]
}

export async function getFriends(userId) {
  const r = await pool.query(`
    SELECT s.id, s.name, s.email, s.last_active FROM friends f
    JOIN signups s ON s.id = f.friend_id
    WHERE f.user_id = $1 AND s.verified = 1
  `, [userId])
  return r.rows.map(row => ({ ...row, isActive: isActive(row.last_active) }))
}

export async function addFriend(userId, friendId) {
  if (userId === friendId) return false
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId]
  try {
    await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)', [a, b])
    await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)', [b, a])
    return true
  } catch {
    return false
  }
}

export async function sendFriendRequest(requesterId, recipientId) {
  if (requesterId === recipientId) return null
  if (await areFriends(requesterId, recipientId)) return null
  if (await hasPendingFriendRequest(requesterId, recipientId)) return null
  try {
    const r = await pool.query(`
      INSERT INTO friend_requests (requester_id, recipient_id, status, date) VALUES ($1, $2, 'pending', NOW())
      RETURNING id
    `, [requesterId, recipientId])
    return r.rows[0].id
  } catch {
    return null
  }
}

async function hasPendingFriendRequest(requesterId, recipientId) {
  const r = await pool.query(`
    SELECT 1 FROM friend_requests WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'
  `, [requesterId, recipientId])
  return !!r.rows[0]
}

export async function getPendingRequestsReceived(userId) {
  const r = await pool.query(`
    SELECT fr.id, fr.requester_id, fr.date, s.name, s.email
    FROM friend_requests fr
    JOIN signups s ON s.id = fr.requester_id
    WHERE fr.recipient_id = $1 AND fr.status = 'pending'
    ORDER BY fr.date DESC
  `, [userId])
  return r.rows
}

async function getFriendRequestById(id) {
  const r = await pool.query("SELECT * FROM friend_requests WHERE id = $1 AND status = 'pending'", [id])
  return r.rows[0] || null
}

export async function acceptFriendRequest(requestId, recipientId) {
  const req = await getFriendRequestById(requestId)
  if (!req || Number(req.recipient_id) !== Number(recipientId)) return false
  try {
    await addFriend(req.requester_id, req.recipient_id)
    await pool.query('UPDATE friend_requests SET status = $1 WHERE id = $2', ['accepted', requestId])
    return true
  } catch {
    return false
  }
}

export async function rejectFriendRequest(requestId, recipientId) {
  const req = await getFriendRequestById(requestId)
  if (!req || req.recipient_id !== recipientId) return false
  await pool.query('UPDATE friend_requests SET status = $1 WHERE id = $2', ['rejected', requestId])
  return true
}

export async function getPendingRequestIdsSent(userId) {
  const r = await pool.query(`
    SELECT recipient_id FROM friend_requests WHERE requester_id = $1 AND status = 'pending'
  `, [userId])
  return new Set(r.rows.map(row => row.recipient_id))
}

export async function getPendingRequestIdsReceived(userId) {
  const r = await pool.query(`
    SELECT requester_id FROM friend_requests WHERE recipient_id = $1 AND status = 'pending'
  `, [userId])
  return new Set(r.rows.map(row => row.requester_id))
}

export async function areFriends(userId, friendId) {
  const r = await pool.query('SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2', [Math.min(userId, friendId), Math.max(userId, friendId)])
  return !!r.rows[0]
}

export async function removeFriend(userId, friendId) {
  if (userId === friendId) return false
  const friend = await getSignupById(friendId)
  if (!friend) return false
  const admin = await getAdminByEmail(friend.email)
  if (admin) return false
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId]
  try {
    await pool.query('DELETE FROM friends WHERE user_id = $1 AND friend_id = $2', [a, b])
    await pool.query('DELETE FROM friends WHERE user_id = $1 AND friend_id = $2', [b, a])
    return true
  } catch {
    return false
  }
}

export async function searchUsers(query, excludeUserId) {
  const q = `%${(query || '').trim().toLowerCase()}%`
  if (!q || q === '%%') return []
  const r = await pool.query(`
    SELECT id, name, email FROM signups
    WHERE verified = 1 AND id != $1
    AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)
    ORDER BY name LIMIT 20
  `, [excludeUserId || 0, q])
  return r.rows
}

export async function addDirectMessage(senderId, recipientId, message, type = 'text', attachmentPath = null) {
  await pool.query(`
    INSERT INTO direct_messages (sender_id, recipient_id, message, date, type, attachment_path, status)
    VALUES ($1, $2, $3, NOW(), $4, $5, 'sent')
  `, [senderId, recipientId, message || '', type, attachmentPath])
}

async function markDirectMessagesAsSeen(viewerId, otherUserId) {
  await pool.query(`
    UPDATE direct_messages SET status = 'seen'
    WHERE sender_id = $1 AND recipient_id = $2 AND (status IS NULL OR status != 'seen')
  `, [otherUserId, viewerId])
}

export async function getDirectMessages(userId, friendId) {
  await markDirectMessagesAsSeen(userId, friendId)
  const a = Math.min(userId, friendId)
  const b = Math.max(userId, friendId)
  const r = await pool.query(`
    SELECT dm.id, dm.sender_id, dm.recipient_id, dm.message, dm.date, dm.type, dm.attachment_path, dm.status, s.name as sender_name
    FROM direct_messages dm
    JOIN signups s ON s.id = dm.sender_id
    WHERE (dm.sender_id = $1 AND dm.recipient_id = $2) OR (dm.sender_id = $3 AND dm.recipient_id = $4)
    ORDER BY dm.date ASC
  `, [a, b, b, a])
  return r.rows
}

export async function getGames() {
  const r = await pool.query(`
    SELECT id, name, link, logo_path, sort_order FROM games ORDER BY sort_order ASC, id ASC
  `)
  return r.rows
}

export async function getGameById(id) {
  const r = await pool.query('SELECT * FROM games WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createGame(name, link = null, logoPath = null) {
  const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM games')
  const next = maxOrder.rows[0].next
  const r = await pool.query(`
    INSERT INTO games (name, link, logo_path, sort_order) VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [name.trim(), link?.trim() || null, logoPath, next])
  return r.rows[0].id
}

export async function updateGame(id, name, link = null, logoPath = null, clearLogo = false) {
  const existing = await getGameById(id)
  if (!existing) return false
  const finalLogo = clearLogo ? null : (logoPath ?? existing.logo_path)
  await pool.query(`
    UPDATE games SET name = $1, link = $2, logo_path = $3 WHERE id = $4
  `, [name.trim(), link?.trim() || null, finalLogo, id])
  return true
}

export async function deleteGame(id) {
  const r = await pool.query('DELETE FROM games WHERE id = $1', [id])
  return { changes: r.rowCount || 0 }
}

export { hashPassword }
