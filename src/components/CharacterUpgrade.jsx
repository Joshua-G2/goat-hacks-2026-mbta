import { useState, useEffect } from 'react';
import './CharacterUpgrade.css';

const CHARACTERS = [
  {
    id: 'runner',
    name: 'Speed Runner',
    emoji: '🏃',
    baseSpeed: 1.2,
    description: 'Fast walker, great for quick transfers',
    abilities: [
      { level: 1, name: 'Quick Step', bonus: 'Walk 20% faster', cost: 0 },
      { level: 2, name: 'Sprint Master', bonus: '2x transfer speed bonus', cost: 500 },
      { level: 3, name: 'Speed Demon', bonus: 'Earn 50% more distance points', cost: 1000 },
      { level: 4, name: 'Flash Mode', bonus: 'Instant transfer detection', cost: 2000 },
      { level: 5, name: 'Sonic Boom', bonus: '3x all rewards during rush hour', cost: 5000 }
    ],
    color: '#FF6B6B'
  },
  {
    id: 'explorer',
    name: 'Urban Explorer',
    emoji: '🗺️',
    baseSpeed: 1.0,
    description: 'Discovers hidden routes and bonuses',
    abilities: [
      { level: 1, name: 'Pathfinder', bonus: 'See all nearby stations', cost: 0 },
      { level: 2, name: 'Route Master', bonus: 'Reveal optimal routes', cost: 500 },
      { level: 3, name: 'Treasure Hunter', bonus: '2x points at new stations', cost: 1000 },
      { level: 4, name: 'Map Oracle', bonus: 'See real-time delays 10min ahead', cost: 2000 },
      { level: 5, name: 'Dimension Walker', bonus: 'Unlock secret achievement tasks', cost: 5000 }
    ],
    color: '#4ECDC4'
  },
  {
    id: 'commuter',
    name: 'Pro Commuter',
    emoji: '💼',
    baseSpeed: 1.0,
    description: 'Efficient planner with bonus rewards',
    abilities: [
      { level: 1, name: 'Time Manager', bonus: 'Track daily commute stats', cost: 0 },
      { level: 2, name: 'Smart Planner', bonus: 'Auto-suggest best routes', cost: 500 },
      { level: 3, name: 'Multi-tasker', bonus: '2x points during work hours', cost: 1000 },
      { level: 4, name: 'Rush Expert', bonus: 'Triple points 7-9am & 5-7pm', cost: 2000 },
      { level: 5, name: 'Efficiency King', bonus: 'Daily streak multiplier x5', cost: 5000 }
    ],
    color: '#95E1D3'
  },
  {
    id: 'tourist',
    name: 'Happy Tourist',
    emoji: '📸',
    baseSpeed: 0.8,
    description: 'Takes photos and earns bonus XP',
    abilities: [
      { level: 1, name: 'Camera Ready', bonus: 'Take station photos for points', cost: 0 },
      { level: 2, name: 'Memory Lane', bonus: 'Earn 2x at historical stations', cost: 500 },
      { level: 3, name: 'Influencer', bonus: 'Share trips for bonus XP', cost: 1000 },
      { level: 4, name: 'Tour Guide', bonus: 'Help others, gain 3x social points', cost: 2000 },
      { level: 5, name: 'Legend Status', bonus: 'All stations give achievement bonuses', cost: 5000 }
    ],
    color: '#F38181'
  },
  {
    id: 'student',
    name: 'Smart Student',
    emoji: '🎒',
    baseSpeed: 1.0,
    description: 'Learns patterns and earns study bonuses',
    abilities: [
      { level: 1, name: 'Quick Learner', bonus: 'Earn 10% more XP', cost: 0 },
      { level: 2, name: 'Pattern Recognition', bonus: 'Predict train delays', cost: 500 },
      { level: 3, name: 'Study Buddy', bonus: '2x points with friends', cost: 1000 },
      { level: 4, name: 'Master Mind', bonus: 'Complete tasks 50% faster', cost: 2000 },
      { level: 5, name: 'Genius Mode', bonus: 'Unlock bonus puzzles & rewards', cost: 5000 }
    ],
    color: '#AA96DA'
  }
];

function CharacterUpgrade({ currentCharacter, points, onUpgrade, onSelectCharacter }) {
  const [selectedChar, setSelectedChar] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [upgradingAbility, setUpgradingAbility] = useState(null);

  useEffect(() => {
    const char = CHARACTERS.find(c => c.id === currentCharacter?.id) || CHARACTERS[0];
    setSelectedChar({
      ...char,
      currentLevel: currentCharacter?.level || 1,
      xp: currentCharacter?.xp || 0
    });
  }, [currentCharacter]);

  const handleUpgrade = (ability) => {
    setUpgradingAbility(ability);
    setShowConfirm(true);
  };

  const confirmUpgrade = () => {
    if (upgradingAbility && points >= upgradingAbility.cost) {
      onUpgrade?.({
        characterId: selectedChar.id,
        newLevel: upgradingAbility.level,
        cost: upgradingAbility.cost
      });
      setShowConfirm(false);
      setUpgradingAbility(null);
    }
  };

  const xpForNextLevel = (level) => level * 1000;
  const xpProgress = selectedChar ? (selectedChar.xp % xpForNextLevel(selectedChar.currentLevel)) : 0;
  const xpNeeded = selectedChar ? xpForNextLevel(selectedChar.currentLevel) : 1000;

  return (
    <div className="character-upgrade-panel">
      <div className="upgrade-header">
        <h2>🎮 Character Upgrades</h2>
        <div className="points-display">
          <span className="points-icon">⭐</span>
          <span className="points-value">{points.toLocaleString()}</span>
          <span className="points-label">Points</span>
        </div>
      </div>

      <div className="character-selector-grid">
        {CHARACTERS.map((char) => {
          const isSelected = selectedChar?.id === char.id;
          const isCurrent = currentCharacter?.id === char.id;
          
          return (
            <div
              key={char.id}
              className={`char-select-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => setSelectedChar({ ...char, currentLevel: isCurrent ? currentCharacter.level : 1, xp: isCurrent ? currentCharacter.xp : 0 })}
              style={{ '--char-color': char.color }}
            >
              <div className="char-emoji">{char.emoji}</div>
              <div className="char-name">{char.name}</div>
              {isCurrent && <div className="current-badge">Active</div>}
            </div>
          );
        })}
      </div>

      {selectedChar && (
        <div className="character-details">
          <div className="char-header">
            <div className="char-avatar" style={{ background: selectedChar.color }}>
              <span className="char-emoji-large">{selectedChar.emoji}</span>
            </div>
            <div className="char-info">
              <h3>{selectedChar.name}</h3>
              <p className="char-description">{selectedChar.description}</p>
              <div className="char-stats">
                <div className="stat">
                  <span className="stat-label">Speed</span>
                  <span className="stat-value">{selectedChar.baseSpeed}x</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Level</span>
                  <span className="stat-value">{selectedChar.currentLevel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="xp-bar-container">
            <div className="xp-label">
              <span>XP Progress</span>
              <span>{xpProgress}/{xpNeeded}</span>
            </div>
            <div className="xp-bar">
              <div 
                className="xp-fill" 
                style={{ width: `${(xpProgress / xpNeeded) * 100}%` }}
              />
            </div>
          </div>

          <div className="abilities-tree">
            <h4>🌟 Ability Tree</h4>
            <div className="abilities-list">
              {selectedChar.abilities.map((ability, index) => {
                const isUnlocked = ability.level <= selectedChar.currentLevel;
                const canUnlock = ability.level === selectedChar.currentLevel + 1 && points >= ability.cost;
                const isNext = ability.level === selectedChar.currentLevel + 1;

                return (
                  <div
                    key={ability.level}
                    className={`ability-node ${isUnlocked ? 'unlocked' : ''} ${isNext ? 'next' : ''} ${canUnlock ? 'can-unlock' : ''}`}
                  >
                    <div className="ability-level">
                      <div className="level-circle">{ability.level}</div>
                      {index < selectedChar.abilities.length - 1 && (
                        <div className={`connector ${isUnlocked ? 'active' : ''}`} />
                      )}
                    </div>
                    <div className="ability-content">
                      <div className="ability-header">
                        <h5>{ability.name}</h5>
                        {isUnlocked ? (
                          <span className="unlocked-badge">✓ Unlocked</span>
                        ) : (
                          <span className="cost-badge">{ability.cost} pts</span>
                        )}
                      </div>
                      <p className="ability-bonus">{ability.bonus}</p>
                      {canUnlock && (
                        <button
                          className="unlock-button"
                          onClick={() => handleUpgrade(ability)}
                        >
                          🔓 Unlock Now
                        </button>
                      )}
                      {isNext && !canUnlock && (
                        <div className="requirement-hint">
                          Need {ability.cost - points} more points
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {currentCharacter?.id !== selectedChar.id && (
            <button
              className="switch-character-button"
              onClick={() => onSelectCharacter?.(selectedChar)}
            >
              Switch to {selectedChar.name}
            </button>
          )}
        </div>
      )}

      {showConfirm && upgradingAbility && (
        <div className="upgrade-modal">
          <div className="modal-content">
            <h3>Unlock Ability?</h3>
            <div className="ability-preview">
              <div className="preview-icon">⭐</div>
              <h4>{upgradingAbility.name}</h4>
              <p>{upgradingAbility.bonus}</p>
              <div className="cost-display">
                Cost: <strong>{upgradingAbility.cost}</strong> points
              </div>
            </div>
            <div className="modal-buttons">
              <button
                className="confirm-button"
                onClick={confirmUpgrade}
                disabled={points < upgradingAbility.cost}
              >
                ✓ Confirm
              </button>
              <button
                className="cancel-button"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterUpgrade;
