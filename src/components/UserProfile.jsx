import { useState, useEffect } from 'react';
import { getTitleForXp, MILEAGE_REWARDS } from '../utils/gameHelpers';
import './UserProfile.css';

/**
 * UserProfile Component
 * 
 * Displays user's level, title, XP progress, and achievements
 */
function UserProfile({ xp, miles, tasksCompleted, mapLegend = null }) {
  const [levelInfo, setLevelInfo] = useState(getTitleForXp(0));
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    setLevelInfo(getTitleForXp(xp));
  }, [xp]);

  useEffect(() => {
    // Check which mileage achievements have been unlocked
    const unlocked = MILEAGE_REWARDS.ACHIEVEMENT_MILESTONES
      .filter(milestone => miles >= milestone.miles)
      .map(milestone => milestone);
    setAchievements(unlocked);
  }, [miles]);

  const getProgressBarColor = () => {
    if (levelInfo.progress >= 80) return '#4CAF50';
    if (levelInfo.progress >= 50) return '#FFC107';
    return '#2196F3';
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar">
          <span className="avatar-icon">🚇</span>
          <div className="level-badge">{levelInfo.level}</div>
        </div>
        <div className="profile-info">
          <h2 className="user-title">{levelInfo.title}</h2>
          <div className="xp-display">
            <span className="xp-value">{xp} XP</span>
            {levelInfo.nextLevelXp && (
              <span className="xp-next"> / {levelInfo.nextLevelXp} XP</span>
            )}
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      {levelInfo.nextLevelXp && (
        <div className="progress-section">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{
                width: `${levelInfo.progress}%`,
                background: getProgressBarColor()
              }}
            >
              <span className="progress-text">{levelInfo.progress.toFixed(0)}%</span>
            </div>
          </div>
          <p className="progress-label">
            {levelInfo.nextLevelXp - xp} XP to next level
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{tasksCompleted || 0}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚊</div>
          <div className="stat-content">
            <div className="stat-value">{miles.toFixed(1)}</div>
            <div className="stat-label">Miles Traveled</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{xp}</div>
            <div className="stat-label">Total XP</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{achievements.length}</div>
            <div className="stat-label">Achievements</div>
          </div>
        </div>
      </div>

      {mapLegend && <div className="user-profile-legend">{mapLegend}</div>}

      {/* Achievements Section */}
      {achievements.length > 0 && (
        <div className="achievements-section">
          <h3>🏆 Achievements</h3>
          <div className="achievements-grid">
            {achievements.map((achievement, index) => (
              <div key={index} className="achievement-item">
                <div className="achievement-badge">{achievement.badge}</div>
                <div className="achievement-info">
                  <div className="achievement-title">{achievement.reward}</div>
                  <div className="achievement-desc">{achievement.miles} miles</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free Ticket Progress */}
      <div className="reward-progress">
        <h3>🎁 Free Ticket Progress</h3>
        <div className="reward-bar-container">
          <div 
            className="reward-bar-fill"
            style={{
              width: `${Math.min((miles / MILEAGE_REWARDS.FREE_TICKET_MILES) * 100, 100)}%`
            }}
          />
        </div>
        <p className="reward-label">
          {miles >= MILEAGE_REWARDS.FREE_TICKET_MILES 
            ? '🎉 Free ticket earned!' 
            : `${(MILEAGE_REWARDS.FREE_TICKET_MILES - miles).toFixed(0)} miles to free ticket`}
        </p>
      </div>
    </div>
  );
}

export default UserProfile;
