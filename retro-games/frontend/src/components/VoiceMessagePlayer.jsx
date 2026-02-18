import { useState, useRef, useEffect } from 'react'
import './VoiceMessagePlayer.css'

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceMessagePlayer({ src, caption, className = '' }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  const handleProgressClick = (e) => {
    const audio = audioRef.current
    const bar = e.currentTarget
    if (!audio || !duration) return
    const rect = bar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = percent * duration
    setCurrentTime(audio.currentTime)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
    }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)
    if (audio.duration && !Number.isNaN(audio.duration)) {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
    }
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [src])

  const progress = duration && duration > 0 ? (currentTime / duration) * 100 : 0
  const remaining = duration != null ? Math.max(0, duration - currentTime) : null

  return (
    <div className={`voice-message-player ${className}`}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" playsInline>
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/ogg" />
        <source src={src} type="audio/mpeg" />
      </audio>
      <button
        type="button"
        className={`voice-play-btn ${playing ? 'playing' : ''}`}
        onClick={togglePlayPause}
        title={playing ? 'Pause' : 'Play'}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        <span className="voice-play-icon">{playing ? '⏸' : '▶'}</span>
      </button>
      <div className="voice-progress-wrap">
        <div
          className="voice-progress-bar"
          onClick={handleProgressClick}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          title="Click to seek"
        >
          <div className="voice-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="voice-time-display">
          <span className="voice-time-current">{formatDuration(currentTime)}</span>
          {duration != null && (
            <>
              <span className="voice-time-sep">/</span>
              <span className="voice-time-total">{formatDuration(duration)}</span>
              {playing && remaining != null && remaining > 0 && (
                <span className="voice-time-remaining"> · {formatDuration(remaining)} left</span>
              )}
            </>
          )}
        </div>
      </div>
      {caption && <span className="voice-caption">{caption}</span>}
    </div>
  )
}
