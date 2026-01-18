import { useState, useEffect } from 'react';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useMBTAPolling } from '../services/mbtaService';
import { WalkingProviderManager } from '../services/walkingProvider';
import './DecisionEngineDemo.css';

/**
 * DecisionEngineDemo - Live demonstration of the MBTA Decision Engine
 * 
 * Features:
 * - Real-time GPS tracking with auto-recovery
 * - Live MBTA vehicle positions (8-second polling)
 * - Walking time estimation (SerpAPI → Heuristic fallback)
 * - System status monitoring
 */
function DecisionEngineDemo() {
  // GPS Tracking Hook
  const { position, heading, accuracy, status: gpsStatus, lastUpdate, error } = useGPSTracking();
  
  // MBTA Polling Hook - Monitor Red, Orange, and Green lines
  const { vehicles, status: mbtaStatus, lastUpdate: mbtaLastUpdate } = useMBTAPolling(
    ['Red', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E'],
    8000 // Poll every 8 seconds
  );
  
  // Walking Provider Manager
  const [walkingManager] = useState(() => new WalkingProviderManager());
  const [walkingSource, setWalkingSource] = useState('INITIALIZING');
  const [walkingTest, setWalkingTest] = useState(null);
  
  // Test walking estimation on mount
  useEffect(() => {
    const testWalking = async () => {
      // Test: South Station to Park Street (famous transfer)
      const from = { lat: 42.352271, lng: -71.055242 };
      const to = { lat: 42.356395, lng: -71.062424 };
      
      const result = await walkingManager.getWalkingEstimate(from, to);
      
      if (result.ok) {
        setWalkingTest({
          distance: (result.value.distanceMeters / 1609.34).toFixed(2) + ' mi',
          duration: Math.round(result.value.durationSeconds / 60) + ' min',
          source: result.value.source
        });
      } else {
        setWalkingTest({ error: result.error });
      }
      
      setWalkingSource(walkingManager.getCurrentSource());
    };
    
    testWalking();
    
    // Update source status every 5 seconds
    const interval = setInterval(() => {
      setWalkingSource(walkingManager.getCurrentSource());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [walkingManager]);
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };
  
  // Status pill color
  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
      case 'LIVE':
        return '#22c55e';
      case 'STALE':
        return '#f59e0b';
      case 'ERROR':
      case 'DENIED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="decision-engine-demo">
      <div className="demo-header">
        <h2>🚇 MBTA Decision Engine Demo</h2>
        <p>Real-time transit intelligence system</p>
      </div>
      
      {/* System Status Pills */}
      <div className="status-pills">
        <div className="status-pill" style={{ borderColor: getStatusColor(gpsStatus) }}>
          <span className="status-label">GPS</span>
          <span className="status-value" style={{ color: getStatusColor(gpsStatus) }}>
            {gpsStatus}
          </span>
          <span className="status-time">{formatTime(lastUpdate)}</span>
        </div>
        
        <div className="status-pill" style={{ borderColor: getStatusColor(mbtaStatus) }}>
          <span className="status-label">MBTA</span>
          <span className="status-value" style={{ color: getStatusColor(mbtaStatus) }}>
            {mbtaStatus}
          </span>
          <span className="status-time">{formatTime(mbtaLastUpdate)}</span>
        </div>
        
        <div className="status-pill" style={{ borderColor: walkingSource === 'SERPAPI' ? '#22c55e' : '#f59e0b' }}>
          <span className="status-label">Walk</span>
          <span className="status-value" style={{ color: walkingSource === 'SERPAPI' ? '#22c55e' : '#f59e0b' }}>
            {walkingSource}
          </span>
        </div>
      </div>
      
      {/* GPS Section */}
      <div className="demo-section">
        <h3>📍 GPS Tracking</h3>
        {position ? (
          <div className="data-grid">
            <div className="data-item">
              <span className="data-label">Latitude:</span>
              <span className="data-value">{position.lat.toFixed(6)}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Longitude:</span>
              <span className="data-value">{position.lng.toFixed(6)}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Accuracy:</span>
              <span className="data-value">{accuracy ? `±${accuracy.toFixed(0)}m` : 'Unknown'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Heading:</span>
              <span className="data-value">{heading !== null ? `${heading.toFixed(0)}°` : 'Unknown'}</span>
            </div>
          </div>
        ) : (
          <div className="error-message">
            {error || 'Waiting for GPS...'}
          </div>
        )}
      </div>
      
      {/* MBTA Live Data Section */}
      <div className="demo-section">
        <h3>🚊 Live Vehicles</h3>
        <div className="vehicle-count">
          <span className="count-number">{vehicles.length}</span>
          <span className="count-label">trains tracked</span>
        </div>
        
        {vehicles.length > 0 && (
          <div className="vehicle-list">
            {vehicles.slice(0, 5).map((vehicle) => (
              <div key={vehicle.id} className="vehicle-item">
                <div className="vehicle-route" style={{ 
                  backgroundColor: vehicle.routeColor || '#000',
                  color: '#fff'
                }}>
                  {vehicle.routeId}
                </div>
                <div className="vehicle-info">
                  <div className="vehicle-direction">{vehicle.directionId === 0 ? 'Outbound' : 'Inbound'}</div>
                  <div className="vehicle-coords">
                    {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}
                  </div>
                </div>
                <div className="vehicle-status">{vehicle.currentStatus || 'IN_TRANSIT'}</div>
              </div>
            ))}
            {vehicles.length > 5 && (
              <div className="vehicle-more">+ {vehicles.length - 5} more trains</div>
            )}
          </div>
        )}
      </div>
      
      {/* Walking Estimation Section */}
      <div className="demo-section">
        <h3>🚶 Walking Estimation</h3>
        <div className="walk-test">
          <div className="walk-test-route">South Station → Park Street</div>
          {walkingTest ? (
            walkingTest.error ? (
              <div className="error-message">{walkingTest.error}</div>
            ) : (
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Distance:</span>
                  <span className="data-value">{walkingTest.distance}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Duration:</span>
                  <span className="data-value">{walkingTest.duration}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Source:</span>
                  <span className="data-value" style={{ 
                    color: walkingTest.source === 'serpapi' ? '#22c55e' : '#f59e0b'
                  }}>
                    {walkingTest.source === 'serpapi' ? 'SerpAPI' : 'Estimated'}
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="loading">Calculating...</div>
          )}
        </div>
        
        <div className="info-box">
          <strong>Circuit Breaker Status:</strong> {walkingSource}
          <br />
          {walkingSource === 'SERPAPI' && '✅ Using live Google Maps walking directions'}
          {walkingSource === 'ESTIMATED' && '⚠️ Using heuristic model (SerpAPI rate limited)'}
        </div>
      </div>
      
      {/* System Info */}
      <div className="demo-section">
        <h3>⚙️ System Information</h3>
        <div className="info-box">
          <div><strong>GPS Auto-Recovery:</strong> Enabled (restarts on stale)</div>
          <div><strong>MBTA Polling:</strong> Every 8 seconds</div>
          <div><strong>Walking Cache:</strong> 10-minute TTL</div>
          <div><strong>Circuit Breaker:</strong> 2 failures → 60s fallback</div>
          <div><strong>Error Handling:</strong> Result&lt;T, E&gt; pattern (zero runtime errors)</div>
        </div>
      </div>
    </div>
  );
}

export default DecisionEngineDemo;
