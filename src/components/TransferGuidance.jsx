import React, { useState } from 'react';
import ConfidenceIndicator from './ConfidenceIndicator';
import './TransferGuidance.css';

function TransferGuidance({ selectedOrigin, selectedDestination, transferStation, walkingSpeed = 'normal' }) {
  const [speed, setSpeed] = useState(walkingSpeed);
  const transferName = transferStation?.attributes?.name || transferStation?.name || transferStation;
  const originName = selectedOrigin?.attributes?.name || selectedOrigin?.name || selectedOrigin;
  const destinationName = selectedDestination?.attributes?.name || selectedDestination?.name || selectedDestination;
  const hasEndpoints = Boolean(originName && destinationName);
  
  const speedMultipliers = {
    slow: 0.6,
    normal: 1.0,
    fast: 1.3,
  };

  const baseTransferTime = 180;
  const calculatedTime = Math.round(baseTransferTime / speedMultipliers[speed]);
  const confidenceBufferBySpeed = {
    slow: 30,
    normal: 120,
    fast: 240,
  };
  const confidenceConnection = {
    arrivalTime: calculatedTime + confidenceBufferBySpeed[speed],
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="transfer-guidance">
      <h2>Transfer Guidance</h2>
      
      {hasEndpoints ? (
        <>
          <div className="transfer-info">
            <h3>
              {transferName ? `Transfer at: ${transferName}` : `Trip: ${originName} → ${destinationName}`}
            </h3>
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

            <div className="transfer-confidence">
              <ConfidenceIndicator
                connection={confidenceConnection}
                transferTime={calculatedTime}
                walkingTime={calculatedTime}
              />
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
          <p>Select origin and destination to see live connections</p>
        </div>
      )}
    </div>
  );
}

export default TransferGuidance;
