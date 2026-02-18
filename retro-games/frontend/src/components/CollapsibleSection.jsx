import { useState } from 'react'
import './CollapsibleSection.css'

function CollapsibleSection({ title, children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`collapsible-section ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-icon">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleSection
