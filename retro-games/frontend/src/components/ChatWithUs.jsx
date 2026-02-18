import { useState, useRef, useEffect, useCallback } from 'react'
import { sendMessage, getMessages } from '../api/client'
import Logo from './Logo'
import VoiceMessagePlayer from './VoiceMessagePlayer'
import MessageStatus from './MessageStatus'
import './ChatWithUs.css'

const SUPPORT_NAME = 'Winfinity Support'

function ChatWithUs({ token, userName }) {
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const loadMessages = useCallback(async () => {
    if (!token) return
    try {
      const msgs = await getMessages(token)
      setMessages(msgs)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const interval = setInterval(loadMessages, 4000)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendText = async (e) => {
    e.preventDefault()
    if ((!chatInput.trim() && !imageFile) || !token) return
    setSending(true)
    try {
      await sendMessage(chatInput.trim() || null, token, { image: imageFile || undefined })
      setChatInput('')
      setImageFile(null)
      setImagePreview(null)
      await loadMessages()
    } finally {
      setSending(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
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
        if (blob.size > 0 && token) {
          setSending(true)
          try {
            await sendMessage(null, token, { voice: blob })
            await loadMessages()
          } finally {
            setSending(false)
          }
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Mic access denied:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    return isToday ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString()
  }

  return (
    <div className="chat-with-us">
      <div className="chat-header">
        <div className="chat-avatar support"><Logo size="small" /></div>
        <div className="chat-header-info">
          <h3>{SUPPORT_NAME}</h3>
          <span className="chat-status">Online · Typically replies within minutes</span>
        </div>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <div className="chat-loading-dots">
              <span /><span /><span />
            </div>
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p>Start a conversation with {SUPPORT_NAME}</p>
            <span>Ask questions, share screenshots, or send a voice message</span>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.type || 'text'} ${m.senderType === 'support' ? 'from-support' : 'from-me'}`}>
              <div className="chat-bubble-meta">
                <span className="chat-sender">{m.senderName || userName}</span>
                <span className="chat-time">{formatTime(m.date)}</span>
                {m.senderType === 'user' && <MessageStatus status={m.status} />}
              </div>
              {m.type === 'image' && m.attachmentUrl ? (
                <div className="chat-attachment">
                  <img src={m.attachmentUrl} alt="Shared" />
                  {m.message && m.message !== '📷 Image' && <p className="chat-caption">{m.message}</p>}
                </div>
              ) : m.type === 'voice' && m.attachmentUrl ? (
                <div className="chat-voice">
                  <VoiceMessagePlayer
                    src={m.attachmentUrl}
                    caption={m.message && m.message !== '🎤 Voice message' ? m.message : null}
                    className="chat-voice-player"
                  />
                </div>
              ) : (
                <p>{m.message}</p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendText} className="chat-input-area">
        {imagePreview && (
          <div className="chat-image-preview">
            <img src={imagePreview} alt="Preview" />
            <button type="button" className="chat-remove-image" onClick={clearImage} aria-label="Remove">×</button>
          </div>
        )}
        <div className="chat-input-row">
          <label className="chat-attach-btn" title="Send image">
            <input type="file" accept="image/*" onChange={handleImageSelect} hidden />
            📷
          </label>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="chat-text-input"
          />
          <button
            type="button"
            className={`chat-voice-btn ${recording ? 'recording' : ''}`}
            title={recording ? 'Stop recording' : 'Record voice message'}
            onClick={() => (recording ? stopRecording() : startRecording())}
          >
            {recording ? '⏹ Stop' : '🎤'}
          </button>
          <button type="submit" className="chat-send-btn" disabled={sending || (!chatInput.trim() && !imageFile)}>
            {sending ? '...' : '➤'}
          </button>
        </div>
        <p className="chat-hint">You&apos;re chatting with {SUPPORT_NAME}</p>
      </form>
    </div>
  )
}

export default ChatWithUs
