/**
 * Storage layer - uses Supabase Storage when configured, else local disk.
 * Handles message attachments, feed images/videos, and game logos.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const UPLOADS_BUCKET = 'uploads'

export const useSupabaseStorage = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY)

let supabase = null
if (useSupabaseStorage) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  console.log('Using Supabase Storage for uploads')
} else {
  const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads')
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  console.log('Using local disk for uploads')
}

/**
 * Get the public URL for a stored file.
 * @param {string} storedPath - Path/filename stored in DB (e.g. "msg_123.jpg" or "messages/msg_123.jpg")
 */
export function getFileUrl(storedPath) {
  if (!storedPath) return null
  if (useSupabaseStorage) {
    const url = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(storedPath)
    return url.data.publicUrl
  }
  const baseUrl = process.env.API_BASE || `http://localhost:${process.env.PORT || 3002}`
  return `${baseUrl}/uploads/${storedPath}`
}

/**
 * Upload a file buffer to storage. Returns the path to store in DB.
 * @param {Buffer} buffer - File buffer
 * @param {string} prefix - Filename prefix (e.g. 'msg', 'feed', 'game')
 * @param {string} folder - Subfolder for Supabase (e.g. 'messages', 'feed', 'games')
 * @param {string} ext - File extension (e.g. '.jpg', '.webm')
 * @param {string} contentType - MIME type
 */
export async function uploadFile(buffer, prefix, folder, ext, contentType) {
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`
  const safePath = `${folder}/${filename}`

  if (useSupabaseStorage) {
    const { error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(safePath, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        const { error: createErr } = await supabase.storage.createBucket(UPLOADS_BUCKET, { public: true })
        if (createErr) {
          console.error('Supabase Storage: Could not create bucket:', createErr)
          throw new Error('Storage upload failed: ' + error.message)
        }
        const { error: retryErr } = await supabase.storage
          .from(UPLOADS_BUCKET)
          .upload(safePath, buffer, { contentType: contentType || 'application/octet-stream' })
        if (retryErr) throw new Error('Storage upload failed: ' + retryErr.message)
      } else {
        throw new Error('Storage upload failed: ' + error.message)
      }
    }
    return safePath
  }

  const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads')
  const localPath = path.join(UPLOADS_DIR, filename)
  fs.writeFileSync(localPath, buffer)
  return filename
}
