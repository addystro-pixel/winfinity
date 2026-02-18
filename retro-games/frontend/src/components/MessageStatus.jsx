import './MessageStatus.css'

export default function MessageStatus({ status }) {
  if (!status) return null
  const s = (status || 'sent').toLowerCase()
  return (
    <span className={`msg-status msg-status-${s}`} title={s === 'seen' ? 'Seen' : s === 'delivered' ? 'Delivered' : 'Sent'}>
      {s === 'seen' ? (
        <span className="msg-status-double msg-status-seen">✓✓</span>
      ) : s === 'delivered' ? (
        <span className="msg-status-double">✓✓</span>
      ) : (
        <span className="msg-status-single">✓</span>
      )}
    </span>
  )
}
