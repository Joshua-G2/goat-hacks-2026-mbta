import { useState } from 'react';
import './CharacterSelector.css';

const CHARACTERS = [
  { id: 'runner', emoji: '🏃', name: 'Runner', speed: 1.2, description: 'Fast walker, great for tight transfers' },
  { id: 'casual', emoji: '🚶', name: 'Casual', speed: 1.0, description: 'Standard pace, balanced gameplay' },
  { id: 'tourist', emoji: '📸', name: 'Tourist', speed: 0.8, description: 'Takes time to explore, earns bonus XP' },
  { id: 'commuter', emoji: '💼', name: 'Commuter', speed: 1.1, description: 'Expert navigator, knows shortcuts' },
  { id: 'student', emoji: '🎒', name: 'Student', speed: 0.9, description: 'Budget-friendly, daily quest specialist' }
];

function CharacterSelector({ selectedCharacter, onSelect, onClose }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="character-selector-overlay">
      <div className="character-selector-modal">
        <div className="modal-header">
          <h2>Choose Your Character</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="character-grid">
          {CHARACTERS.map(char => (
            <div
              key={char.id}
              className={`character-card ${selectedCharacter?.id === char.id ? 'selected' : ''} ${hoveredId === char.id ? 'hovered' : ''}`}
              onClick={() => onSelect(char)}
              onMouseEnter={() => setHoveredId(char.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="character-emoji">{char.emoji}</div>
              <div className="character-name">{char.name}</div>
              <div className="character-speed">
                Speed: {(char.speed * 3).toFixed(1)} mph
              </div>
              {hoveredId === char.id && (
                <div className="character-description">
                  {char.description}
                </div>
              )}
              {selectedCharacter?.id === char.id && (
                <div className="selected-badge">✓ Selected</div>
              )}
            </div>
          ))}
        </div>
        
        <div className="modal-footer">
          <p>Your character affects walk speed and special abilities!</p>
        </div>
      </div>
    </div>
  );
}

export default CharacterSelector;
export { CHARACTERS };
