import React from 'react';
import './ConfidenceIndicator.css';

function ConfidenceIndicator({ connection, transferTime, walkingTime }) {
  const calculateConfidence = () => {
    if (!connection || !transferTime || !walkingTime) {
      return null;
    }

    const availableTime = connection.arrivalTime;
    const requiredTime = walkingTime + 60;
    const comfortableTime = walkingTime + 180;

    if (availableTime >= comfortableTime) {
      return {
        level: 'likely',
        label: 'Likely',
        percentage: 90,
        message: 'Plenty of time for this transfer',
      };
    } else if (availableTime >= requiredTime) {
      return {
        level: 'risky',
        label: 'Risky',
        percentage: 60,
        message: 'Tight connection - hurry but doable',
      };
    } else {
      return {
        level: 'unlikely',
        label: 'Unlikely',
        percentage: 25,
        message: 'Very tight - consider next train',
      };
    }
  };

  const confidence = calculateConfidence();

  if (!confidence) {
    return null;
  }

  return (
    <div className={`confidence-indicator ${confidence.level}`}>
      <div className="confidence-badge">
        <span className={`badge ${confidence.level}`}>
          {confidence.label}
        </span>
        <span className="confidence-percentage">
          {confidence.percentage}% success rate
        </span>
      </div>

      <div className="confidence-details">
        <p className="confidence-message">{confidence.message}</p>
        
        <div className="factors">
          <div className="factor">
            <span className="factor-label">Walking time:</span>
            <span className="factor-value">{Math.floor(walkingTime / 60)}m</span>
          </div>
          <div className="factor">
            <span className="factor-label">Transfer buffer:</span>
            <span className="factor-value">
              {confidence.level === 'likely' && '3+ min ✓'}
              {confidence.level === 'risky' && '1-3 min ⚠'}
              {confidence.level === 'unlikely' && '<1 min ✗'}
            </span>
          </div>
          <div className="factor">
            <span className="factor-label">Service status:</span>
            <span className="factor-value">Normal</span>
          </div>
        </div>

        {confidence.level === 'unlikely' && (
          <div className="alternative-suggestion">
            <strong>💡 Tip:</strong> Consider waiting for the next train to ensure a comfortable transfer
          </div>
        )}
        
        {confidence.level === 'risky' && (
          <div className="risk-warning">
            <strong>⚠️ Note:</strong> Move quickly and know your route. Delays could cause you to miss this connection.
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfidenceBadge({ level }) {
  const labels = {
    likely: { text: 'Likely', icon: '✓' },
    risky: { text: 'Risky', icon: '⚠' },
    unlikely: { text: 'Unlikely', icon: '✗' },
  };

  const badge = labels[level] || labels.likely;

  return (
    <span className={`confidence-badge-compact ${level}`}>
      {badge.icon} {badge.text}
    </span>
  );
}

export default ConfidenceIndicator;
