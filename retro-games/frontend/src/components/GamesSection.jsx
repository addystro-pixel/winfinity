import { useState, useEffect } from 'react'
import { getGames } from '../api/client'
import './GamesSection.css'

function GamesSection() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGames()
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="games-content">
        <h3 className="games-title">Available Games</h3>
        <p className="games-loading">Loading games...</p>
      </div>
    )
  }

  return (
    <div className="games-content">
      <h3 className="games-title">Available Games</h3>
      <div className="games-grid">
        {games.map((game) => {
          const CardTag = game.link ? 'a' : 'div'
          const linkProps = game.link
            ? { href: game.link, target: '_blank', rel: 'noopener noreferrer' }
            : {}
          return (
            <CardTag key={game.id} className="game-card" {...linkProps}>
              {game.logoUrl ? (
                <img src={game.logoUrl} alt="" className="game-logo" />
              ) : (
                <div className="game-icon">{game.name?.charAt(0) || '?'}</div>
              )}
              <div className="game-info">
                <h4>{game.name}</h4>
                <span className="game-status live">Live</span>
              </div>
            </CardTag>
          )
        })}
      </div>
    </div>
  )
}

export default GamesSection
