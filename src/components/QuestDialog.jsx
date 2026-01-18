import { useState } from 'react';
import './QuestDialog.css';

/**
 * QuestDialog Component
 * 
 * Displays dynamic quests generated via AI (RAG + LLM)
 * In production, this would integrate with backend API for quest generation
 */
function QuestDialog({ quest, onAccept, onDecline, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if (quest?.audioUrl) {
      // In production, use Web Audio API or HTML5 Audio
      const audio = new Audio(quest.audioUrl);
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  if (!quest) return null;

  return (
    <div className="quest-dialog-overlay">
      <div className="quest-dialog">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="quest-header">
          <div className="quest-icon">📜</div>
          <h2 className="quest-title">{quest.title || 'New Quest Available'}</h2>
        </div>

        <div className="quest-content">
          <div className="npc-avatar">
            <span className="npc-icon">{quest.npcIcon || '🎭'}</span>
          </div>

          <div className="quest-text">
            {quest.text || quest.description}
          </div>

          {quest.audioUrl && (
            <div className="audio-controls">
              <button 
                className={`play-audio-button ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayAudio}
                disabled={isPlaying}
              >
                {isPlaying ? '🔊 Playing...' : '🔊 Listen to Quest'}
              </button>
            </div>
          )}

          <div className="quest-details">
            <div className="quest-detail-item">
              <span className="detail-icon">📍</span>
              <span className="detail-text">
                Location: {quest.location?.name || quest.stationName || 'Unknown'}
              </span>
            </div>
            <div className="quest-detail-item">
              <span className="detail-icon">⭐</span>
              <span className="detail-text">
                Reward: {quest.xpReward || quest.reward || 0} XP
              </span>
            </div>
          </div>
        </div>

        <div className="quest-actions">
          <button className="decline-button" onClick={onDecline || onClose}>
            Decline
          </button>
          <button className="accept-button" onClick={onAccept}>
            Accept Quest
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestDialog;
