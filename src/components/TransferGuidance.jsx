import React, { useState } from 'react';
import './TransferGuidance.css';

function TransferGuidance({ transferStation, walkingSpeed = 'normal' }) {
  const [speed, setSpeed] = useState(walkingSpeed);
  
  const speedMultipliers = {
    slow: 0.6,
    normal: 1.0,
    fast: 1.3,
  };

  const baseTransferTime = 180;
  const calculatedTime = Math.round(baseTransferTime / speedMultipliers[speed]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="transfer-guidance">
      <h2>Transfer Guidance</h2>
      
      {transferStation ? (
        <>
          <div className="transfer-info">
            <h3>Transfer at: {transferStation}</h3>
            <div className="transfer-path">
              <div className="path-step">
                <span className="step-icon">🚶</span>
                <div className="step-details">
                  <p className="step-title">Exit arriving train</p>
                  <p className="step-time">~15s</p>
                </div>
              </div>
              
              <div className="path-step">
                <span className="step-icon">🚪</span>
                <div className="step-details">
                  <p className="step-title">Navigate to connecting platform</p>
                  <p className="step-time">~{formatTime(calculatedTime - 30)}</p>
                </div>
              </div>
              
              <div className="path-step">
                <span className="step-icon">⏱️</span>
                <div className="step-details">
                  <p className="step-title">Board connecting train</p>
                  <p className="step-time">~15s</p>
                </div>
              </div>
            </div>

            <div className="total-transfer-time">
              <strong>Estimated Transfer Time: {formatTime(calculatedTime)}</strong>
            </div>
          </div>

          <div className="walking-speed-control">
            <label htmlFor="walk-speed">
              <span>🚶 Walking Speed:</span>
            </label>
            <div className="speed-options">
              <button 
                className={`speed-btn ${speed === 'slow' ? 'active' : ''}`}
                onClick={() => setSpeed('slow')}
              >
                Slow
              </button>
              <button 
                className={`speed-btn ${speed === 'normal' ? 'active' : ''}`}
                onClick={() => setSpeed('normal')}
              >
                Normal
              </button>
              <button 
                className={`speed-btn ${speed === 'fast' ? 'active' : ''}`}
                onClick={() => setSpeed('fast')}
              >
                Fast
              </button>
            </div>
            <p className="speed-description">
              {speed === 'slow' && '3 km/h - Taking it easy, carrying luggage, or mobility considerations'}
              {speed === 'normal' && '5 km/h - Average walking pace'}
              {speed === 'fast' && '6.5 km/h - Brisk walk, in a hurry'}
            </p>
          </div>

          <div className="accessibility-info">
            <h4>♿ Accessibility</h4>
            <ul>
              <li>✅ Elevator available</li>
              <li>✅ Escalator available</li>
              <li>⚠️ May be crowded during rush hours (7-9 AM, 5-7 PM)</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="no-transfer-selected">
          <p>Select a transfer station to see guidance</p>
        </div>
      )}
    </div>
  );
}

export default TransferGuidance;
