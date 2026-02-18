import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import nodemailer from 'nodemailer'
import {
  getAllSignups,
  createSignup,
  getSignupByToken,
  getSignupByEmail,
  getSignupById,
  updateVerificationToken,
  markSignupVerified,
  deleteSignup,
  addMessage,
  getMessagesByUser,
  getAllMessages,
  getMessagesForUser,
  getFeedPosts,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  getFeedPostById,
  getAdminStats,
  getAdminByEmail,
  getAdminById,
  getAllAdmins,
  getAdminFriends,
  addAdminFriend,
  areAdminFriends,
  getFriends,
  addFriend,
  removeFriend,
  areFriends,
  searchUsers,
  sendFriendRequest,
  getPendingRequestsReceived,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequestIdsSent,
  getPendingRequestIdsReceived,
  addDirectMessage,
  getDirectMessages,
  getGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  updateUserActive,
  isUserActive,
} from './db.js'
import { getPhoneLengthForCountry } from './phoneValidation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const PORT = process.env.PORT || 3002
const API_BASE = process.env.API_BASE || `http://localhost:${PORT}`
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

const TOKEN_EXPIRY_HOURS = 24
const JWT_SECRET = process.env.JWT_SECRET || 'winfinity-secret-change-in-production'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verify
}

function verifyUserToken(req, res, next) {
  const auth = req.headers.authorization?.replace('Bearer ', '')
  if (!auth) return res.status(401).json({ error: 'Login required' })
  try {
    const decoded = jwt.verify(auth, JWT_SECRET)
    req.userId = decoded.userId
    updateUserActive(req.userId)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'audio/webm' || file.mimetype === 'audio/ogg' ? '.webm' : path.extname(file.originalname) || '.jpg'
    cb(null, `msg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

const feedStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg')
    cb(null, `feed_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`)
  },
})
const feedUpload = multer({
  storage: feedStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

const gameLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `game_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`)
  },
})
const gameLogoUpload = multer({
  storage: gameLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email?.trim())
}

function isValidPhone(number, countryCode) {
  const cleaned = String(number || '').replace(/\D/g, '')
  const { min, max } = getPhoneLengthForCountry(countryCode)
  return cleaned.length >= min && cleaned.length <= max
}

function hashSensitive(value) {
  return crypto.createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex')
}


function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.adminId) {
      req.adminId = decoded.adminId
      return next()
    }
  } catch {}
  res.status(401).json({ error: 'Unauthorized' })
}

async function sendVerificationEmail(to, token, userName) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_USER and GMAIL_APP_PASSWORD not set - skipping email send')
    return false
  }
  const verifyUrl = `http://localhost:${PORT}/verify?token=${token}`
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD.trim(),
    },
    tls: { rejectUnauthorized: true },
  })
  await transporter.sendMail({
    from: `"Winfinity" <${GMAIL_USER}>`,
    to,
    subject: 'Verify your email - Winfinity',
    html: `
      <p>Hi ${userName || 'there'},</p>
      <p>Thanks for signing up! Please verify your email by clicking the button below:</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%); color: #030712; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 10px; font-family: Arial, sans-serif;">Verify Email</a>
      </p>
      <p style="font-size: 12px; color: #666;">This link expires in 24 hours.</p>
      <p>If you didn't sign up, you can ignore this email.</p>
      <p>— Winfinity</p>
    `,
  })
  return true
}

app.post('/api/signup', async (req, res) => {
  const { name, email, number, countryCode, password } = req.body || {}

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Full name is required' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  const code = countryCode || '+1'
  const localNumber = String(number || '').trim()
  if (!isValidPhone(localNumber, code)) {
    return res.status(400).json({ error: 'Please enter a valid phone number for the selected country' })
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const emailLower = email.trim().toLowerCase()
  const existing = getSignupByEmail(emailLower)

  if (existing && existing.verified) {
    return res.status(400).json({ error: 'This email is already registered. Please login.' })
  }

  const verificationToken = crypto.randomBytes(32).toString('hex')
  const tokenExpires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  const fullNumber = `${code} ${localNumber}`.trim()
  const numberHash = hashSensitive(fullNumber)
  const passwordHash = hashPassword(password)

  if (existing) {
    updateVerificationToken(existing.id, verificationToken, tokenExpires, passwordHash)
  } else {
    createSignup({
      name: name.trim(),
      email: emailLower,
      number: fullNumber,
      numberHash,
      passwordHash,
      verificationToken,
      tokenExpires,
    })
  }

  let emailSent = false
  try {
    emailSent = await sendVerificationEmail(emailLower, verificationToken, name.trim())
    if (emailSent) console.log('Verification email sent to', emailLower)
  } catch (err) {
    console.error('Email send failed:', err.message)
    console.error('Full error:', err)
  }

  res.json({
    success: true,
    message: emailSent
      ? 'Verification email sent! Check your inbox (and spam folder) and click the link to complete.'
      : 'Signup received. Email failed to send - check server logs. Configure GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env',
  })
})

app.post('/api/resend-verification', async (req, res) => {
  const { email, password } = req.body || {}
  const emailLower = (email || '').trim().toLowerCase()
  if (!emailLower) {
    return res.status(400).json({ error: 'Email is required' })
  }
  const existing = getSignupByEmail(emailLower)
  if (!existing) {
    return res.status(404).json({ error: 'No signup found for this email. Please sign up first.' })
  }
  if (existing.verified) {
    return res.json({ success: true, message: 'This email is already verified.' })
  }
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const tokenExpires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  const passwordHash = password && String(password).length >= 6 ? hashPassword(password) : null
  updateVerificationToken(existing.id, verificationToken, tokenExpires, passwordHash)
  let emailSent = false
  try {
    emailSent = await sendVerificationEmail(emailLower, verificationToken, existing.name)
    if (emailSent) console.log('Resend: verification email sent to', emailLower)
  } catch (err) {
    console.error('Resend email failed:', err.message)
  }
  res.json({
    success: true,
    message: emailSent
      ? 'Verification email sent! Check your inbox and spam folder.'
      : 'Resend failed. Check server logs for errors.',
  })
})

app.get('/verify', (req, res) => {
  const token = (req.query.token || '').trim()
  const siteUrl = (SITE_URL || 'http://localhost:5173').replace(/\/$/, '')

  if (!token) return res.redirect(`${siteUrl}/verify?error=invalid`)

  const signup = getSignupByToken(token)
  if (!signup) {
    return res.redirect(`${siteUrl}/verify?done=1&already=1`)
  }
  if (signup.verified) {
    return res.redirect(`${siteUrl}/verify?done=1&already=1`)
  }
  const expiresAt = signup.token_expires ? new Date(signup.token_expires).getTime() : 0
  if (expiresAt && Date.now() > expiresAt) {
    return res.redirect(`${siteUrl}/verify?error=expired`)
  }

  markSignupVerified(signup.id)
  res.redirect(`${siteUrl}/verify?done=1`)
})

app.get('/api/verify', (req, res) => {
  const token = (req.query.token || '').trim()
  if (!token) return res.status(400).json({ error: 'Token required', status: 'invalid' })

  const signup = getSignupByToken(token)
  if (!signup) {
    return res.json({ success: false, status: 'invalid', message: 'Invalid or expired verification link' })
  }
  if (signup.verified) {
    return res.json({ success: false, status: 'already_verified', message: 'This email has already been verified.' })
  }
  const expiresAt = signup.token_expires ? new Date(signup.token_expires).getTime() : 0
  if (expiresAt && Date.now() > expiresAt) {
    return res.json({ success: false, status: 'expired', message: 'This verification link has expired.' })
  }

  markSignupVerified(signup.id)
  res.json({ success: true, status: 'verified', message: 'Your email has been successfully verified.' })
})

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {}
  const admin = getAdminByEmail(email?.trim())
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ success: true, token, admin: { id: admin.id, email: admin.email, name: admin.name } })
})

app.get('/api/signups', verifyAdminToken, (req, res) => {
  const signups = getAllSignups()
  res.json(signups.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    number: s.number,
    date: s.date,
    verified: s.verified,
    isActive: s.isActive,
  })))
})

app.delete('/api/signups/:id', verifyAdminToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = deleteSignup(id)
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' })
  res.json({ success: true, message: 'User deleted' })
})

app.put('/api/admin/signups/:id/verify', verifyAdminToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const signup = getSignupById(id)
  if (!signup) return res.status(404).json({ error: 'User not found' })
  if (signup.verified) return res.json({ success: true, message: 'Already verified' })
  markSignupVerified(id)
  res.json({ success: true, message: 'User verified' })
})

app.get('/api/admin/stats', verifyAdminToken, (req, res) => {
  try {
    const stats = getAdminStats()
    res.json(stats)
  } catch (err) {
    console.error('getAdminStats error:', err)
    res.status(500).json({ error: 'Failed to load stats' })
  }
})

function mapFeedPostsWithUrls(posts) {
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  return posts.map(p => ({
    ...p,
    imageUrl: p.image_url ? `${baseUrl}/uploads/${p.image_url}` : null,
    videoUrl: p.video_url ? `${baseUrl}/uploads/${p.video_url}` : null,
  }))
}

app.get('/api/admin/feed', verifyAdminToken, (req, res) => {
  const posts = getFeedPosts()
  res.json(mapFeedPostsWithUrls(posts))
})

app.post('/api/admin/feed', verifyAdminToken, (req, res) => {
  return feedUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
    const { title, content } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
    const imageFile = req.files?.image?.[0]
    const videoFile = req.files?.video?.[0]
    const imageUrl = imageFile ? imageFile.filename : null
    const videoUrl = videoFile ? videoFile.filename : null
    const id = createFeedPost(title.trim(), (content || '').trim(), imageUrl, videoUrl)
    res.json({ success: true, id })
  })
})

app.put('/api/admin/feed/:id', verifyAdminToken, (req, res) => {
  return feedUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
    const existing = getFeedPostById(id)
    if (!existing) return res.status(404).json({ error: 'Post not found' })
    const { title, content, clearImage, clearVideo } = req.body || {}
    const imageFile = req.files?.image?.[0]
    const videoFile = req.files?.video?.[0]
    let imageUrl = existing.image_url
    let videoUrl = existing.video_url
    if (imageFile) imageUrl = imageFile.filename
    else if (clearImage === 'true' || clearImage === true) imageUrl = null
    if (videoFile) videoUrl = videoFile.filename
    else if (clearVideo === 'true' || clearVideo === true) videoUrl = null
    updateFeedPost(id, (title ?? existing.title).trim(), (content ?? existing.content ?? '').trim(), imageUrl, videoUrl)
    res.json({ success: true })
  })
})

app.delete('/api/admin/feed/:id', verifyAdminToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = deleteFeedPost(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Post not found' })
  res.json({ success: true })
})

function mapGamesWithUrls(games) {
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  return games.map(g => ({
    id: g.id,
    name: g.name,
    link: g.link || null,
    logoUrl: g.logo_path ? `${baseUrl}/uploads/${g.logo_path}` : null,
    sortOrder: g.sort_order,
  }))
}

app.get('/api/games', (req, res) => {
  const games = getGames()
  res.json(mapGamesWithUrls(games))
})

app.get('/api/admin/games', verifyAdminToken, (req, res) => {
  const games = getGames()
  res.json(mapGamesWithUrls(games))
})

app.post('/api/admin/games', verifyAdminToken, (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return gameLogoUpload.single('logo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
      const { name, link } = req.body || {}
      if (!name?.trim()) return res.status(400).json({ error: 'Game name required' })
      const logoFile = req.file
      const id = createGame(name.trim(), link?.trim() || null, logoFile?.filename || null)
      res.json({ success: true, id })
    })
  }
  const { name, link } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Game name required' })
  const id = createGame(name.trim(), link?.trim() || null, null)
  res.json({ success: true, id })
})

app.put('/api/admin/games/:id', verifyAdminToken, (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  const handler = (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
    const existing = getGameById(id)
    if (!existing) return res.status(404).json({ error: 'Game not found' })
    const { name, link, clearLogo } = req.body || {}
    const logoFile = req.file
    let logoPath = existing.logo_path
    if (logoFile) logoPath = logoFile.filename
    else if (clearLogo === 'true' || clearLogo === true) logoPath = null
    updateGame(id, (name ?? existing.name).trim(), link ?? existing.link, logoPath, clearLogo === 'true' || clearLogo === true)
    res.json({ success: true })
  }
  if (contentType.includes('multipart/form-data')) {
    return gameLogoUpload.single('logo')(req, res, handler)
  }
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const existing = getGameById(id)
  if (!existing) return res.status(404).json({ error: 'Game not found' })
  const { name, link } = req.body || {}
  updateGame(id, (name ?? existing.name).trim(), link ?? existing.link, existing.logo_path, false)
  res.json({ success: true })
})

app.delete('/api/admin/games/:id', verifyAdminToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = deleteGame(id)
  if (result.changes === 0) return res.status(404).json({ error: 'Game not found' })
  res.json({ success: true })
})

app.get('/api/admin/messages', verifyAdminToken, (req, res) => {
  const messages = getAllMessages()
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  res.json(messages.map(m => ({
    id: m.id,
    userId: m.user_id,
    message: m.message,
    date: m.date,
    type: m.type || 'text',
    attachmentPath: m.attachment_path,
    attachmentUrl: m.attachment_path ? `${baseUrl}/uploads/${m.attachment_path}` : null,
    userName: m.name,
    userEmail: m.email,
    senderType: m.sender_type || 'user',
  })))
})

app.get('/api/admin/conversation/:userId', verifyAdminToken, (req, res) => {
  const userId = parseInt(req.params.userId, 10)
  if (!userId || isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' })
  const messages = getMessagesForUser(userId)
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  res.json(messages.map(m => ({
    id: m.id,
    message: m.message,
    date: m.date,
    type: m.type || 'text',
    senderType: m.sender_type || 'user',
    senderName: m.senderName,
    attachmentUrl: m.attachment_path ? `${baseUrl}/uploads/${m.attachment_path}` : null,
    status: m.status || 'delivered',
  })))
})

app.get('/api/friends', verifyUserToken, (req, res) => {
  const friends = getFriends(req.userId)
  res.json(friends)
})

app.get('/api/users/search', verifyUserToken, (req, res) => {
  const q = req.query.q || ''
  const users = searchUsers(q, req.userId)
  const friendIds = new Set(getFriends(req.userId).map(f => f.id))
  const requestSentIds = getPendingRequestIdsSent(req.userId)
  const pendingReceived = getPendingRequestsReceived(req.userId)
  const requestReceivedMap = new Map(pendingReceived.map(r => [r.requester_id, r.id]))
  res.json(users.map(u => ({
    ...u,
    isFriend: friendIds.has(u.id),
    requestSent: requestSentIds.has(u.id),
    requestReceived: requestReceivedMap.has(u.id),
    requestId: requestReceivedMap.get(u.id) || null,
  })))
})

app.post('/api/friends', verifyUserToken, (req, res) => {
  const friendId = parseInt(req.body?.friendId, 10)
  if (!friendId || isNaN(friendId)) return res.status(400).json({ error: 'Invalid friend ID' })
  const friend = getSignupById(friendId)
  if (!friend || !friend.verified) return res.status(404).json({ error: 'User not found' })
  if (areFriends(req.userId, friendId)) return res.status(400).json({ error: 'Already friends' })
  const id = sendFriendRequest(req.userId, friendId)
  if (!id) return res.status(400).json({ error: 'Request already sent or could not send' })
  res.json({ success: true, message: 'Friend request sent' })
})

app.get('/api/friend-requests', verifyUserToken, (req, res) => {
  const requests = getPendingRequestsReceived(req.userId)
  res.json(requests.map(r => ({ id: r.id, requesterId: r.requester_id, name: r.name, email: r.email, date: r.date })))
})

app.post('/api/friend-requests/:id/accept', verifyUserToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid request ID' })
  if (!acceptFriendRequest(id, req.userId)) return res.status(400).json({ error: 'Could not accept request' })
  res.json({ success: true, message: 'Friend added' })
})

app.post('/api/friend-requests/:id/reject', verifyUserToken, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid request ID' })
  if (!rejectFriendRequest(id, req.userId)) return res.status(400).json({ error: 'Could not reject request' })
  res.json({ success: true, message: 'Request rejected' })
})

app.delete('/api/friends/:friendId', verifyUserToken, (req, res) => {
  const friendId = parseInt(req.params.friendId, 10)
  if (!friendId || isNaN(friendId)) return res.status(400).json({ error: 'Invalid friend ID' })
  if (!areFriends(req.userId, friendId)) return res.status(404).json({ error: 'Not friends' })
  if (!removeFriend(req.userId, friendId)) return res.status(400).json({ error: 'Cannot remove this friend' })
  res.json({ success: true, message: 'Friend removed' })
})

app.get('/api/direct-messages/:friendId', verifyUserToken, (req, res) => {
  const friendId = parseInt(req.params.friendId, 10)
  if (!friendId || isNaN(friendId)) return res.status(400).json({ error: 'Invalid friend ID' })
  if (!areFriends(req.userId, friendId)) return res.status(403).json({ error: 'Must be friends to chat' })
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  const messages = getDirectMessages(req.userId, friendId)
  res.json(messages.map(m => ({
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    message: m.message,
    date: m.date,
    type: m.type || 'text',
    attachmentUrl: m.attachment_path ? `${baseUrl}/uploads/${m.attachment_path}` : null,
    senderName: m.sender_name,
    isOwn: m.sender_id === req.userId,
    status: m.status || 'delivered',
  })))
})

app.post('/api/direct-messages/:friendId', verifyUserToken, (req, res, next) => {
  const friendId = parseInt(req.params.friendId, 10)
  if (!friendId || isNaN(friendId)) return res.status(400).json({ error: 'Invalid friend ID' })
  if (!areFriends(req.userId, friendId)) return res.status(403).json({ error: 'Must be friends to chat' })
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.fields([{ name: 'image', maxCount: 1 }, { name: 'voice', maxCount: 1 }])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
      const message = req.body?.message?.trim() || ''
      const imageFile = req.files?.image?.[0]
      const voiceFile = req.files?.voice?.[0]
      if (imageFile) {
        addDirectMessage(req.userId, friendId, message || '📷 Image', 'image', imageFile.filename)
      } else if (voiceFile) {
        addDirectMessage(req.userId, friendId, message || '🎤 Voice message', 'voice', voiceFile.filename)
      } else if (message) {
        addDirectMessage(req.userId, friendId, message, 'text')
      } else {
        return res.status(400).json({ error: 'Message, image, or voice required' })
      }
      return res.json({ success: true })
    })
  }
  const { message } = req.body || {}
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' })
  addDirectMessage(req.userId, friendId, message.trim(), 'text')
  res.json({ success: true })
})

app.get('/api/admin/admins', verifyAdminToken, (req, res) => {
  const admins = getAllAdmins()
  const friends = getAdminFriends(req.adminId)
  const friendIds = new Set(friends.map(f => f.id))
  res.json(admins.map(a => ({
    id: a.id,
    email: a.email,
    name: a.name,
    isFriend: friendIds.has(a.id),
    isSelf: a.id === req.adminId,
  })))
})

app.get('/api/admin/friends', verifyAdminToken, (req, res) => {
  const friends = getAdminFriends(req.adminId)
  res.json(friends)
})

app.post('/api/admin/friends', verifyAdminToken, (req, res) => {
  const friendAdminId = parseInt(req.body?.friendAdminId, 10)
  if (!friendAdminId || isNaN(friendAdminId)) return res.status(400).json({ error: 'Invalid admin ID' })
  if (friendAdminId === req.adminId) return res.status(400).json({ error: 'Cannot add yourself' })
  const admin = getAdminById(friendAdminId)
  if (!admin) return res.status(404).json({ error: 'Admin not found' })
  if (areAdminFriends(req.adminId, friendAdminId)) return res.status(400).json({ error: 'Already friends' })
  if (!addAdminFriend(req.adminId, friendAdminId)) return res.status(400).json({ error: 'Could not add friend' })
  res.json({ success: true, message: 'Friend added' })
})

app.post('/api/admin/reply', verifyAdminToken, (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.fields([{ name: 'image', maxCount: 1 }, { name: 'voice', maxCount: 1 }])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
      const userId = parseInt(req.body?.userId, 10)
      if (!userId || isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' })
      const user = getSignupById(userId)
      if (!user) return res.status(404).json({ error: 'User not found' })
      const message = req.body?.message?.trim() || ''
      const imageFile = req.files?.image?.[0]
      const voiceFile = req.files?.voice?.[0]
      if (imageFile) {
        addMessage(userId, message || '📷 Image', 'image', imageFile.filename, 'support')
      } else if (voiceFile) {
        addMessage(userId, message || '🎤 Voice message', 'voice', voiceFile.filename, 'support')
      } else if (message) {
        addMessage(userId, message, 'text', null, 'support')
      } else {
        return res.status(400).json({ error: 'Message, image, or voice required' })
      }
      return res.json({ success: true, message: 'Reply sent' })
    })
  }
  const { userId, message } = req.body || {}
  const id = parseInt(userId, 10)
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' })
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' })
  const user = getSignupById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  addMessage(id, message.trim(), 'text', null, 'support')
  res.json({ success: true, message: 'Reply sent' })
})

app.post('/api/user/login', (req, res) => {
  const { email, password } = req.body || {}
  const emailLower = (email || '').trim().toLowerCase()
  if (!emailLower || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const user = getSignupByEmail(emailLower)
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  updateUserActive(user.id)
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      number: user.number,
      verified: !!user.verified,
    },
  })
})

app.get('/api/user/me', verifyUserToken, (req, res) => {
  const user = getSignupById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    number: user.number,
    verified: !!user.verified,
    date: user.date,
  })
})

app.post('/api/messages', verifyUserToken, (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.fields([{ name: 'image', maxCount: 1 }, { name: 'voice', maxCount: 1 }])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
      const message = req.body?.message?.trim() || ''
      const imageFile = req.files?.image?.[0]
      const voiceFile = req.files?.voice?.[0]
      if (imageFile) {
        addMessage(req.userId, message || '📷 Image', 'image', imageFile.filename)
      } else if (voiceFile) {
        addMessage(req.userId, message || '🎤 Voice message', 'voice', voiceFile.filename)
      } else if (message) {
        addMessage(req.userId, message, 'text')
      } else {
        return res.status(400).json({ error: 'Message, image, or voice required' })
      }
      return res.json({ success: true, message: 'Message sent' })
    })
  }
  const { message } = req.body || {}
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' })
  addMessage(req.userId, message.trim(), 'text')
  res.json({ success: true, message: 'Message sent' })
})

app.get('/api/messages', verifyUserToken, (req, res) => {
  const messages = getMessagesByUser(req.userId)
  const baseUrl = process.env.API_BASE || `http://localhost:${PORT}`
  res.json(messages.map(m => ({
    id: m.id,
    message: m.message,
    date: m.date,
    type: m.type || 'text',
    attachmentPath: m.attachment_path,
    attachmentUrl: m.attachment_path ? `${baseUrl}/uploads/${m.attachment_path}` : null,
    senderName: m.sender_type === 'support' ? 'Winfinity Support' : m.name,
    senderType: m.sender_type || 'user',
    status: m.status || 'delivered',
  })))
})

app.get('/api/feed', (req, res) => {
  const posts = getFeedPosts()
  res.json(mapFeedPostsWithUrls(posts))
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Winfinity server running on http://localhost:${PORT}`)
  console.log(`Database: backend/data/winfinity.db`)
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD to enable verification emails')
  }
})
