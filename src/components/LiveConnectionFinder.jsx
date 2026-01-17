import React, { useState } from 'react';
import './LiveConnectionFinder.css';

const PLACEHOLDER_CONNECTIONS = [
  {
    id: 1,
    route: 'Red Line',
    direction: 'Ashmont',
    arrivalTime: new Date(Date.now() + 3 * 60000),
    status: 'On time',
    platform: 'Southbound',
  },
  {
    id: 2,
    route: 'Red Line',
    direction: 'Braintree',
    arrivalTime: new Date(Date.now() + 5 * 60000),
    status: 'On time',
    platform: 'Southbound',
  },
  {
    id: 3,
    route: 'Red Line',
    direction: 'Ashmont',
    arrivalTime: new Date(Date.now() + 9 * 60000),
    status: 'Delayed 2 min',
    platform: 'Southbound',
  },
];

function LiveConnectionFinder({ originStop, transferStop, destinationStop }) {
  const [connections] = useState(PLACEHOLDER_CONNECTIONS);
  const [lastUpdate] = useState(new Date());

  const getTimeUntil = (arrivalTime) => {
    const now = new Date();
    const diff = Math.floor((arrivalTime - now) / 1000);
    
    if (diff < 0) return 'Departed';
    if (diff < 60) return `${diff}s`;
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="live-connection-finder">
      <div className="finder-header">
        <h2>📡 Live Connections</h2>
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {originStop && destinationStop ? (
        <>
          <div className="route-summary">
            <div className="route-point">
              <span className="point-label">From</span>
              <span className="point-name">{originStop}</span>
            </div>
            {transferStop && (
              <>
                <span className="route-arrow">→</span>
                <div className="route-point">
                  <span className="point-label">Transfer</span>
                  <span className="point-name">{transferStop}</span>
                </div>
              </>
            )}
            <span className="route-arrow">→</span>
            <div className="route-point">
              <span className="point-label">To</span>
              <span className="point-name">{destinationStop}</span>
            </div>
          </div>

          <div className="connections-list">
            <h3>Next Trains</h3>
            {connections.length > 0 ? (
              connections.map((connection) => (
                <div key={connection.id} className="connection-card">
                  <div className="connection-route">
                    <span className="route-name">{connection.route}</span>
                    <span className="route-direction">to {connection.direction}</span>
                  </div>
                  
                  <div className="connection-timing">
                    <div className="countdown">
                      {getTimeUntil(connection.arrivalTime)}
                    </div>
                    <div className="absolute-time">
                      {formatTime(connection.arrivalTime)}
                    </div>
                  </div>

                  <div className="connection-details">
                    <span className="platform">{connection.platform}</span>
                    <span className={`status ${connection.status.includes('Delayed') ? 'delayed' : 'on-time'}`}>
                      {connection.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-connections">
                <p>No upcoming trains found</p>
                <p className="hint">Check back in a moment...</p>
              </div>
            )}
          </div>

          <button className="refresh-btn" onClick={() => console.log('Refresh')}>
            🔄 Refresh Predictions
          </button>
        </>
      ) : (
        <div className="no-route-selected">
          <p>Select origin and destination to see live connections</p>
        </div>
      )}
    </div>
  );
}

export default LiveConnectionFinder;
