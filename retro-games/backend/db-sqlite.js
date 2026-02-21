/**
 * SQLite database adapter. Used when DATABASE_URL is not set (local dev).
 * All exports are async for compatibility with db-pg.
 */
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(pwd, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'winfinity.db')

const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    number TEXT NOT NULL,
    number_hash TEXT,
    date TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    verification_token TEXT,
    token_expires TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);
  CREATE INDEX IF NOT EXISTS idx_signups_date ON signups(date);
`)

const tableInfo = db.prepare("PRAGMA table_info(signups)").all()
const cols = tableInfo.map(c => c.name)
if (!cols.includes('token_expires')) db.exec('ALTER TABLE signups ADD COLUMN token_expires TEXT')
if (!cols.includes('number_hash')) db.exec('ALTER TABLE signups ADD COLUMN number_hash TEXT')
if (!cols.includes('password_hash')) db.exec('ALTER TABLE signups ADD COLUMN password_hash TEXT')
if (!cols.includes('last_active')) db.exec('ALTER TABLE signups ADD COLUMN last_active TEXT')
if (!cols.includes('login_count')) db.exec('ALTER TABLE signups ADD COLUMN login_count INTEGER DEFAULT 0')

const ACTIVE_THRESHOLD_MINUTES = 5

function isActive(lastActive) {
  if (!lastActive) return false
  const diff = (Date.now() - new Date(lastActive).getTime()) / 60000
  return diff <= ACTIVE_THRESHOLD_MINUTES
}

export async function updateUserActive(userId) {
  if (!userId) return
  db.prepare('UPDATE signups SET last_active = ? WHERE id = ?').run(new Date().toISOString(), userId)
}

export async function isUserActive(userId) {
  const row = db.prepare('SELECT last_active FROM signups WHERE id = ?').get(userId)
  return isActive(row?.last_active)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    attachment_path TEXT,
    FOREIGN KEY (user_id) REFERENCES signups(id)
  );
`)
const msgInfo = db.prepare("PRAGMA table_info(messages)").all()
const msgCols = msgInfo.map(c => c.name)
if (!msgCols.includes('type')) db.exec("ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'")
if (!msgCols.includes('attachment_path')) db.exec('ALTER TABLE messages ADD COLUMN attachment_path TEXT')
if (!msgCols.includes('sender_type')) {
  db.exec("ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'user'")
  db.exec("UPDATE messages SET sender_type = 'user' WHERE sender_type IS NULL")
}
if (!msgCols.includes('status')) {
  db.exec("ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'delivered'")
  db.exec("UPDATE messages SET status = COALESCE(status, 'delivered')")
}

db.exec(`
  CREATE TABLE IF NOT EXISTS feed_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL
  );
`)
const feedInfo = db.prepare("PRAGMA table_info(feed_posts)").all()
const feedCols = feedInfo.map(c => c.name)
if (!feedCols.includes('image_url')) db.exec('ALTER TABLE feed_posts ADD COLUMN image_url TEXT')
if (!feedCols.includes('video_url')) db.exec('ALTER TABLE feed_posts ADD COLUMN video_url TEXT')

const feedCount = db.prepare('SELECT COUNT(*) as c FROM feed_posts').get()
if (feedCount.c === 0) {
  db.prepare(`
    INSERT INTO feed_posts (title, content, date) VALUES
    ('Welcome to Winfinity!', 'Your ultimate online gaming destination. Play, compete, and win!', datetime('now')),
    ('$5 Freeplay', 'Verify your email to claim your $5 freeplay bonus. Follow us on Facebook or Instagram!', datetime('now')),
    ('New Games Coming', 'Stay tuned for exciting new games. Follow us for updates!', datetime('now'))
  `).run()
}

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_friends (
    admin_id INTEGER NOT NULL,
    friend_admin_id INTEGER NOT NULL,
    PRIMARY KEY (admin_id, friend_admin_id),
    FOREIGN KEY (admin_id) REFERENCES admins(id),
    FOREIGN KEY (friend_admin_id) REFERENCES admins(id),
    CHECK (admin_id != friend_admin_id)
  );
  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES signups(id),
    FOREIGN KEY (friend_id) REFERENCES signups(id),
    CHECK (user_id != friend_id)
  );
  CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    date TEXT NOT NULL,
    UNIQUE(requester_id, recipient_id),
    FOREIGN KEY (requester_id) REFERENCES signups(id),
    FOREIGN KEY (recipient_id) REFERENCES signups(id),
    CHECK (requester_id != recipient_id)
  );
  CREATE TABLE IF NOT EXISTS direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    attachment_path TEXT,
    status TEXT DEFAULT 'sent',
    FOREIGN KEY (sender_id) REFERENCES signups(id),
    FOREIGN KEY (recipient_id) REFERENCES signups(id)
  );
`)
const dmInfo = db.prepare("PRAGMA table_info(direct_messages)").all()
const dmCols = dmInfo.map(c => c.name)
if (!dmCols.includes('status')) {
  db.exec("ALTER TABLE direct_messages ADD COLUMN status TEXT DEFAULT 'delivered'")
  db.exec("UPDATE direct_messages SET status = COALESCE(status, 'delivered')")
}
const adminInfo = db.prepare("PRAGMA table_info(admins)").all()
const adminCols = adminInfo.map(c => c.name)
if (!adminCols.includes('role')) db.exec("ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'super'")
if (!adminCols.includes('permissions')) db.exec("ALTER TABLE admins ADD COLUMN permissions TEXT")
if (!adminCols.includes('created_by')) db.exec('ALTER TABLE admins ADD COLUMN created_by INTEGER')
db.prepare("UPDATE admins SET role = 'super' WHERE role IS NULL OR role = ''").run()
db.prepare("UPDATE admins SET permissions = '{\"users\":true,\"chat\":true,\"feed\":true,\"games\":true,\"admins\":true,\"settings\":true}' WHERE role = 'super' AND (permissions IS NULL OR permissions = '')").run()

const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get()
if (adminCount.c === 0) {
  const now = new Date().toISOString()
  db.prepare("INSERT INTO admins (email, name, password_hash, date, role, permissions) VALUES (?, ?, ?, ?, 'super', '{\"users\":true,\"chat\":true,\"feed\":true,\"games\":true,\"admins\":true,\"settings\":true}')").run('addystro@gmail.com', 'Admin', hashPassword('CACTUS4590'), now)
}
const admin2Exists = db.prepare('SELECT 1 FROM admins WHERE email = ?').get('admin2@winfinity.com')
if (!admin2Exists) {
  db.prepare("INSERT INTO admins (email, name, password_hash, date, role, permissions) VALUES (?, ?, ?, ?, 'admin', '{\"users\":true,\"chat\":true,\"feed\":false,\"games\":false,\"admins\":false,\"settings\":false}')").run('admin2@winfinity.com', 'Admin 2', hashPassword('admin123'), new Date().toISOString())
}

export async function getAllSignups() {
  const rows = db.prepare(`
    SELECT id, name, email, number, date, verified, verification_token, last_active, login_count
    FROM signups ORDER BY id DESC
  `).all()
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    number: r.number,
    date: r.date,
    verified: !!r.verified,
    verificationToken: r.verification_token,
    isActive: isActive(r.last_active),
    loginCount: r.login_count ?? 0,
  }))
}

export async function createSignup({ name, email, number, numberHash, passwordHash, verified = false, verificationToken, tokenExpires }) {
  const verifiedVal = verified ? 1 : 0
  const result = db.prepare(`
    INSERT INTO signups (name, email, number, number_hash, password_hash, date, verified, verification_token, token_expires)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, number, numberHash || null, passwordHash || null, new Date().toISOString(), verifiedVal, verificationToken || null, tokenExpires || null)
  return result.lastInsertRowid
}

export async function getSignupByToken(token) {
  return db.prepare('SELECT * FROM signups WHERE verification_token = ?').get(token)
}

export async function getSignupByEmail(email) {
  return db.prepare(`
    SELECT * FROM signups WHERE LOWER(email) = LOWER(?)
    ORDER BY id DESC LIMIT 1
  `).get(email)
}

export async function getSignupById(id) {
  return db.prepare('SELECT * FROM signups WHERE id = ?').get(id)
}

export async function updateVerificationToken(id, token, tokenExpires, passwordHash) {
  if (passwordHash) {
    db.prepare('UPDATE signups SET verification_token = ?, token_expires = ?, password_hash = ? WHERE id = ?').run(token, tokenExpires, passwordHash, id)
  } else {
    db.prepare('UPDATE signups SET verification_token = ?, token_expires = ? WHERE id = ?').run(token, tokenExpires, id)
  }
}

export async function markSignupVerified(id) {
  db.prepare('UPDATE signups SET verified = 1, verification_token = NULL WHERE id = ?').run(id)
}

export async function updateSignupToVerified(id, passwordHash) {
  db.prepare('UPDATE signups SET verified = 1, verification_token = NULL, token_expires = NULL, password_hash = ? WHERE id = ?').run(passwordHash, id)
}

export async function incrementLoginCount(userId) {
  db.prepare('UPDATE signups SET login_count = COALESCE(login_count, 0) + 1 WHERE id = ?').run(userId)
}

export async function deleteSignup(id) {
  db.prepare('DELETE FROM messages WHERE user_id = ?').run(id)
  const r = db.prepare('DELETE FROM signups WHERE id = ?').run(id)
  return { changes: r.changes }
}

export async function addMessage(userId, message, type = 'text', attachmentPath = null, senderType = 'user') {
  const result = db.prepare(`
    INSERT INTO messages (user_id, message, date, type, attachment_path, sender_type, status) VALUES (?, ?, ?, ?, ?, ?, 'sent')
  `).run(userId, message || '', new Date().toISOString(), type, attachmentPath, senderType)
  return result.lastInsertRowid
}

function markSupportMessagesAsSeen(userId) {
  db.prepare("UPDATE messages SET status = 'seen' WHERE user_id = ? AND sender_type = 'support' AND (status IS NULL OR status != 'seen')").run(userId)
}

function markUserMessagesAsSeen(userId) {
  db.prepare("UPDATE messages SET status = 'seen' WHERE user_id = ? AND sender_type = 'user' AND (status IS NULL OR status != 'seen')").run(userId)
}

export async function getMessagesByUser(userId) {
  markSupportMessagesAsSeen(userId)
  return db.prepare(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, m.status, s.name
    FROM messages m JOIN signups s ON s.id = m.user_id
    WHERE m.user_id = ? ORDER BY m.date ASC
  `).all(userId)
}

export async function getMessagesForUser(userId) {
  markUserMessagesAsSeen(userId)
  const rows = db.prepare(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, m.status
    FROM messages m WHERE m.user_id = ? ORDER BY m.date ASC
  `).all(userId)
  const user = db.prepare('SELECT * FROM signups WHERE id = ?').get(userId)
  return rows.map(r => ({
    ...r,
    userName: user?.name,
    userEmail: user?.email,
    senderName: r.sender_type === 'support' ? 'Winfinity Support' : (user?.name || 'User'),
  }))
}

export async function getAllMessages() {
  return db.prepare(`
    SELECT m.id, m.user_id, m.message, m.date, m.type, m.attachment_path, m.sender_type, s.name, s.email
    FROM messages m JOIN signups s ON s.id = m.user_id
    ORDER BY m.date DESC
  `).all()
}

export async function getFeedPosts() {
  return db.prepare('SELECT * FROM feed_posts ORDER BY date DESC LIMIT 20').all()
}

export async function createFeedPost(title, content, imageUrl = null, videoUrl = null) {
  const result = db.prepare(`
    INSERT INTO feed_posts (title, content, image_url, video_url, date) VALUES (?, ?, ?, ?, ?)
  `).run(title, content, imageUrl, videoUrl, new Date().toISOString())
  return result.lastInsertRowid
}

export async function updateFeedPost(id, title, content, imageUrl = undefined, videoUrl = undefined) {
  const existing = db.prepare('SELECT * FROM feed_posts WHERE id = ?').get(id)
  if (!existing) return
  const img = imageUrl !== undefined ? imageUrl : (existing.image_url || null)
  const vid = videoUrl !== undefined ? videoUrl : (existing.video_url || null)
  db.prepare('UPDATE feed_posts SET title = ?, content = ?, image_url = ?, video_url = ?, date = ? WHERE id = ?').run(title, content, img, vid, new Date().toISOString(), id)
}

export async function deleteFeedPost(id) {
  const r = db.prepare('DELETE FROM feed_posts WHERE id = ?').run(id)
  return { changes: r.changes }
}

export async function getFeedPostById(id) {
  return db.prepare('SELECT * FROM feed_posts WHERE id = ?').get(id)
}

export async function getAdminStats() {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM signups').get()
  const verifiedUsers = db.prepare('SELECT COUNT(*) as c FROM signups WHERE verified = 1').get()
  const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get()
  const totalFeedPosts = db.prepare('SELECT COUNT(*) as c FROM feed_posts').get()
  const recentSignups = db.prepare('SELECT id, name, email, verified, date FROM signups ORDER BY date DESC LIMIT 5').all()
  return {
    totalUsers: totalUsers.c,
    verifiedUsers: verifiedUsers.c,
    pendingVerification: totalUsers.c - verifiedUsers.c,
    totalMessages: totalMessages.c,
    totalFeedPosts: totalFeedPosts.c,
    recentSignups: recentSignups.map(s => ({ ...s, verified: !!s.verified })),
  }
}

export async function getAdminByEmail(email) {
  return db.prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)').get(email)
}

export async function getAdminById(id) {
  return db.prepare('SELECT * FROM admins WHERE id = ?').get(id)
}

export async function getAllAdmins() {
  const rows = db.prepare('SELECT id, email, name, date, role, permissions, created_by FROM admins ORDER BY name').all()
  return rows.map(r => ({ ...r, permissions: r.permissions ? JSON.parse(r.permissions) : null }))
}

export async function createAdmin({ email, name, passwordHash, role = 'admin', permissions, createdBy }) {
  const perms = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || {})
  const result = db.prepare(`
    INSERT INTO admins (email, name, password_hash, date, role, permissions, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(email, name, passwordHash, new Date().toISOString(), role, perms, createdBy || null)
  return result.lastInsertRowid
}

export async function getAdminFriends(adminId) {
  return db.prepare(`
    SELECT a.id, a.email, a.name FROM admin_friends f
    JOIN admins a ON a.id = f.friend_admin_id
    WHERE f.admin_id = ?
  `).all(adminId)
}

export async function addAdminFriend(adminId, friendAdminId) {
  if (adminId === friendAdminId) return false
  try {
    db.prepare('INSERT INTO admin_friends (admin_id, friend_admin_id) VALUES (?, ?)').run(adminId, friendAdminId)
    db.prepare('INSERT INTO admin_friends (admin_id, friend_admin_id) VALUES (?, ?)').run(friendAdminId, adminId)
    return true
  } catch {
    return false
  }
}

export async function areAdminFriends(adminId, friendAdminId) {
  const row = db.prepare('SELECT 1 FROM admin_friends WHERE admin_id = ? AND friend_admin_id = ?').get(adminId, friendAdminId)
  return !!row
}

export async function getFriends(userId) {
  const rows = db.prepare(`
    SELECT s.id, s.name, s.email, s.last_active FROM friends f
    JOIN signups s ON s.id = f.friend_id
    WHERE f.user_id = ? AND s.verified = 1
  `).all(userId)
  return rows.map(r => ({ ...r, isActive: isActive(r.last_active) }))
}

export async function addFriend(userId, friendId) {
  if (userId === friendId) return false
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId]
  try {
    db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)').run(a, b)
    db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)').run(b, a)
    return true
  } catch {
    return false
  }
}

function hasPendingFriendRequest(requesterId, recipientId) {
  const row = db.prepare('SELECT 1 FROM friend_requests WHERE requester_id = ? AND recipient_id = ? AND status = \'pending\'').get(requesterId, recipientId)
  return !!row
}

export async function sendFriendRequest(requesterId, recipientId) {
  if (requesterId === recipientId) return null
  if (db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').get(Math.min(requesterId, recipientId), Math.max(requesterId, recipientId))) return null
  if (hasPendingFriendRequest(requesterId, recipientId)) return null
  try {
    const result = db.prepare('INSERT INTO friend_requests (requester_id, recipient_id, status, date) VALUES (?, ?, \'pending\', ?)').run(requesterId, recipientId, new Date().toISOString())
    return result.lastInsertRowid
  } catch {
    return null
  }
}

export async function getPendingRequestsReceived(userId) {
  return db.prepare(`
    SELECT fr.id, fr.requester_id, fr.date, s.name, s.email
    FROM friend_requests fr JOIN signups s ON s.id = fr.requester_id
    WHERE fr.recipient_id = ? AND fr.status = 'pending'
    ORDER BY fr.date DESC
  `).all(userId)
}

function getFriendRequestById(id) {
  return db.prepare("SELECT * FROM friend_requests WHERE id = ? AND status = 'pending'").get(id)
}

export async function acceptFriendRequest(requestId, recipientId) {
  const req = getFriendRequestById(requestId)
  if (!req || Number(req.recipient_id) !== Number(recipientId)) return false
  try {
    const [a, b] = req.requester_id < req.recipient_id ? [req.requester_id, req.recipient_id] : [req.recipient_id, req.requester_id]
    db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)').run(a, b)
    db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)').run(b, a)
    db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('accepted', requestId)
    return true
  } catch {
    return false
  }
}

export async function rejectFriendRequest(requestId, recipientId) {
  const req = getFriendRequestById(requestId)
  if (!req || req.recipient_id !== recipientId) return false
  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('rejected', requestId)
  return true
}

export async function getPendingRequestIdsSent(userId) {
  const rows = db.prepare('SELECT recipient_id FROM friend_requests WHERE requester_id = ? AND status = \'pending\'').all(userId)
  return new Set(rows.map(r => r.recipient_id))
}

export async function getPendingRequestIdsReceived(userId) {
  const rows = db.prepare('SELECT requester_id FROM friend_requests WHERE recipient_id = ? AND status = \'pending\'').all(userId)
  return new Set(rows.map(r => r.requester_id))
}

export async function areFriends(userId, friendId) {
  const row = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').get(Math.min(userId, friendId), Math.max(userId, friendId))
  return !!row
}

export async function removeFriend(userId, friendId) {
  if (userId === friendId) return false
  const friend = db.prepare('SELECT * FROM signups WHERE id = ?').get(friendId)
  if (!friend) return false
  const admin = db.prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)').get(friend.email)
  if (admin) return false
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId]
  try {
    db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(a, b)
    db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(b, a)
    return true
  } catch {
    return false
  }
}

export async function searchUsers(query, excludeUserId) {
  const q = `%${(query || '').trim().toLowerCase()}%`
  if (!q || q === '%%') return []
  return db.prepare(`
    SELECT id, name, email FROM signups
    WHERE verified = 1 AND id != ?
    AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
    ORDER BY name LIMIT 20
  `).all(excludeUserId || 0, q, q)
}

export async function addDirectMessage(senderId, recipientId, message, type = 'text', attachmentPath = null) {
  db.prepare(`
    INSERT INTO direct_messages (sender_id, recipient_id, message, date, type, attachment_path, status)
    VALUES (?, ?, ?, ?, ?, ?, 'sent')
  `).run(senderId, recipientId, message || '', new Date().toISOString(), type, attachmentPath)
}

function markDirectMessagesAsSeen(viewerId, otherUserId) {
  db.prepare('UPDATE direct_messages SET status = \'seen\' WHERE sender_id = ? AND recipient_id = ? AND (status IS NULL OR status != \'seen\')').run(otherUserId, viewerId)
}

export async function getDirectMessages(userId, friendId) {
  markDirectMessagesAsSeen(userId, friendId)
  const a = Math.min(userId, friendId)
  const b = Math.max(userId, friendId)
  return db.prepare(`
    SELECT dm.id, dm.sender_id, dm.recipient_id, dm.message, dm.date, dm.type, dm.attachment_path, dm.status, s.name as sender_name
    FROM direct_messages dm JOIN signups s ON s.id = dm.sender_id
    WHERE (dm.sender_id = ? AND dm.recipient_id = ?) OR (dm.sender_id = ? AND dm.recipient_id = ?)
    ORDER BY dm.date ASC
  `).all(a, b, b, a)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    link TEXT,
    logo_path TEXT,
    sort_order INTEGER DEFAULT 0
  );
`)
const gamesCount = db.prepare('SELECT COUNT(*) as c FROM games').get()
if (gamesCount.c === 0) {
  const defaultGames = [
    { name: 'Juwa Online', link: 'https://dl.juwa777.com/' },
    { name: 'Game Vault', link: 'https://download.gamevault999.com/' },
    { name: 'Milkyway', link: 'https://milkywayapp.xyz/' },
    { name: 'Cash Frenzy', link: 'https://www.cashfrenzy777.com/' },
    { name: 'YOLO 777', link: 'https://yolo777.game/' },
    { name: 'Cash Machine', link: 'https://www.cashmachine777.com/' },
    { name: 'Gameroom', link: 'https://www.gameroom777.com/' },
    { name: 'Riversweeps', link: 'https://bet777.eu/' },
    { name: 'VBlink', link: 'https://www.vblink777.club/' },
    { name: 'Panda Master', link: 'https://pandamaster.vip:8888/index.html' },
    { name: 'Orion Stars', link: 'http://start.orionstars.vip:8580/index.html' },
    { name: 'Fire Kirin', link: 'https://firekirin.com/' },
    { name: 'JUWA 2.0', link: 'https://m.juwa2.com/' },
  ]
  const insert = db.prepare('INSERT INTO games (name, link, sort_order) VALUES (?, ?, ?)')
  defaultGames.forEach((g, i) => insert.run(g.name, g.link || null, i))
}

export async function getGames() {
  return db.prepare('SELECT id, name, link, logo_path, sort_order FROM games ORDER BY sort_order ASC, id ASC').all()
}

export async function getGameById(id) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id)
}

export async function createGame(name, link = null, logoPath = null) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM games').get()
  const result = db.prepare('INSERT INTO games (name, link, logo_path, sort_order) VALUES (?, ?, ?, ?)').run(name.trim(), link?.trim() || null, logoPath, maxOrder.next)
  return result.lastInsertRowid
}

export async function updateGame(id, name, link = null, logoPath = null, clearLogo = false) {
  const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id)
  if (!existing) return false
  const finalLogo = clearLogo ? null : (logoPath ?? existing.logo_path)
  db.prepare('UPDATE games SET name = ?, link = ?, logo_path = ? WHERE id = ?').run(name.trim(), link?.trim() || null, finalLogo, id)
  return true
}

export async function deleteGame(id) {
  const r = db.prepare('DELETE FROM games WHERE id = ?').run(id)
  return { changes: r.changes }
}

const jsonPath = path.join(__dirname, 'data', 'signups.json')
if (fs.existsSync(jsonPath)) {
  const count = db.prepare('SELECT COUNT(*) as c FROM signups').get()
  if (count.c === 0) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      if (Array.isArray(data) && data.length > 0) {
        const insert = db.prepare(`
          INSERT INTO signups (id, name, email, number, number_hash, password_hash, date, verified, verification_token, token_expires)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const transaction = db.transaction((items) => {
          for (const s of items) {
            insert.run(s.id, s.name, s.email, s.number, null, null, s.date || new Date().toISOString(), s.verified ? 1 : 0, s.verificationToken || s.verification_token || null, null)
          }
        })
        transaction(data)
        fs.renameSync(jsonPath, jsonPath + '.migrated')
        console.log(`Migrated ${data.length} signups from JSON to database`)
      }
    } catch (e) {
      console.warn('Migration skipped:', e.message)
    }
  }
}
