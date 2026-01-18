import { useState, useEffect } from 'react';
import POVMap from './POVMap';
import StopSearchBox from './StopSearchBox';
import CharacterSelector, { CHARACTERS } from './CharacterSelector';
import { evaluateAllTransfers, getConfidenceBadge, TransferConfidence } from '../utils/transferEngine';
import MBTA_API from '../config/mbtaApi';
import './EnhancedGameMap.css';

const POLL_INTERVAL = 8000; // 8 seconds
const GPS_STALE_THRESHOLD = 10000; // 10 seconds

function EnhancedGameMap({ onCompleteTask, onTravel, events, onReportEvent }) {
  // Character & Game State
  const [character, setCharacter] = useState(null);
  const [showCharacterSelect, setShowCharacterSelect] = useState(true);
  const [gamePoints, setGamePoints] = useState(0);
  const [dailyQuestProgress, setDailyQuestProgress] = useState(0);

  // Trip Planning State
  const [originStop, setOriginStop] = useState(null);
  const [destinationStop, setDestinationStop] = useState(null);
  const [tripPlan, setTripPlan] = useState(null);
  const [transferEvaluations, setTransferEvaluations] = useState([]);

  // Live Data State
  const [userPosition, setUserPosition] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [gpsStatus, setGpsStatus] = useState('INITIALIZING');
  const [mbtaStatus, setMbtaStatus] = useState('IDLE');
  const [planStatus, setPlanStatus] = useState('IDLE');

  // Error Recovery
  const [lastGpsUpdate, setLastGpsUpdate] = useState(Date.now());
  const [watchId, setWatchId] = useState(null);

  // ===== GPS TRACKING =====
  useEffect(() => {
    startLocationTracking();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const startLocationTracking = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = [position.coords.latitude, position.coords.longitude];
        setUserPosition(newPos);
        setLastGpsUpdate(Date.now());
        setGpsStatus('OK');
        
        // Award miles for movement
        if (onTravel && userPosition) {
          const distance = calculateDistance(userPosition, newPos);
          if (distance > 0.01) { // More than 50 feet
            onTravel(distance);
            setGamePoints(prev => prev + Math.floor(distance * 100));
          }
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        setGpsStatus('ERROR');
        // Auto-retry after 5 seconds
        setTimeout(startLocationTracking, 5000);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    setWatchId(id);
  };

  // Monitor GPS staleness
  useEffect(() => {
    const checkGPS = setInterval(() => {
      if (Date.now() - lastGpsUpdate > GPS_STALE_THRESHOLD) {
        console.warn('GPS stale, restarting...');
        setGpsStatus('STALE');
        startLocationTracking();
      }
    }, GPS_STALE_THRESHOLD);

    return () => clearInterval(checkGPS);
  }, [lastGpsUpdate]);

  // ===== MBTA DATA POLLING =====
  useEffect(() => {
    if (!tripPlan) return;

    const pollMBTAData = async () => {
      setMbtaStatus('LOADING');
      try {
        // Get all unique routes in the trip
        const routes = [...new Set(tripPlan.legs.map(leg => leg.route.id))];
        
        // Poll vehicles and predictions
        const [vehicleData, predictionData] = await Promise.all([
          Promise.all(routes.map(routeId => MBTA_API.getVehicles(routeId))),
          tripPlan.legs.length > 0 ? MBTA_API.getPredictions(tripPlan.legs[0].fromStop.id) : Promise.resolve({ data: [] })
        ]);

        // Combine vehicle data
        const allVehicles = vehicleData.flatMap(v => v.data || []);
        setVehicles(allVehicles);
        setPredictions(predictionData.data || []);
        setMbtaStatus('LIVE');

        // Re-evaluate transfers
        const evals = await evaluateAllTransfers(tripPlan, character?.speed || 1.0);
        setTransferEvaluations(evals);

      } catch (error) {
        console.error('MBTA polling error:', error);
        setMbtaStatus('DELAYED');
        // Continue polling even on error
      }
    };

    // Poll immediately and then every 8 seconds
    pollMBTAData();
    const interval = setInterval(pollMBTAData, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [tripPlan, character]);

  // ===== TRIP PLANNING =====
  useEffect(() => {
    if (!originStop || !destinationStop) {
      setTripPlan(null);
      setPlanStatus('IDLE');
      return;
    }

    calculateTripPlan();
  }, [originStop, destinationStop, userPosition]);

  const calculateTripPlan = async () => {
    setPlanStatus('COMPUTING');
    try {
      // Find routes serving both stops
      const [originRoutes, destRoutes] = await Promise.all([
        MBTA_API.getStops({ id: originStop.id }, 'route'),
        MBTA_API.getStops({ id: destinationStop.id }, 'route')
      ]);

      // Simple direct route (no transfer for now)
      // In production, implement proper route finding with transfers
      const plan = {
        legs: [{
          fromStop: originStop,
          toStop: destinationStop,
          route: originRoutes.data?.[0] || { id: 'Red', attributes: { long_name: 'Red Line', color: 'DA291C' } },
          mode: 'SUBWAY'
        }],
        totalTime: 15, // Estimate
        transferCount: 0
      };

      setTripPlan(plan);
      setPlanStatus('VALID');

    } catch (error) {
      console.error('Trip planning error:', error);
      setPlanStatus('ERROR');
      // Auto-retry after 3 seconds
      setTimeout(calculateTripPlan, 3000);
    }
  };

  // ===== CHARACTER SELECTION =====
  const handleSelectCharacter = (char) => {
    setCharacter(char);
    setShowCharacterSelect(false);
    console.log(`✓ Selected character: ${char.name} (${char.speed}x speed)`);
  };

  // ===== HELPER FUNCTIONS =====
  function calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return 0;
    const R = 3959; // Earth radius in miles
    const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
    const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  if (!character) {
    return (
      <CharacterSelector
        selectedCharacter={character}
        onSelect={handleSelectCharacter}
        onClose={() => {
          // Select default if user closes without choosing
          setCharacter(CHARACTERS[1]);
          setShowCharacterSelect(false);
        }}
      />
    );
  }

  return (
    <div className="enhanced-game-map">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-pills">
          <div className={`status-pill ${gpsStatus.toLowerCase()}`}>
            GPS: {gpsStatus}
          </div>
          <div className={`status-pill ${mbtaStatus.toLowerCase()}`}>
            MBTA: {mbtaStatus}
          </div>
          <div className={`status-pill ${planStatus.toLowerCase()}`}>
            Plan: {planStatus}
          </div>
        </div>
        <div className="game-stats">
          <span>{character.emoji} {character.name}</span>
          <span>⭐ {gamePoints}</span>
          <span>📊 Quest: {dailyQuestProgress}%</span>
        </div>
      </div>

      {/* Trip Planning Panel */}
      <div className="trip-panel">
        <div className="panel-header">
          <h3>🗺️ Plan Your Journey</h3>
          <button 
            className="character-btn"
            onClick={() => setShowCharacterSelect(true)}
          >
            {character.emoji}
          </button>
        </div>

        <StopSearchBox
          label="Origin"
          value={originStop}
          onChange={setOriginStop}
          placeholder="Where are you starting?"
        />

        <StopSearchBox
          label="Destination"
          value={destinationStop}
          onChange={setDestinationStop}
          placeholder="Where are you going?"
        />

        {/* Transfer Evaluations */}
        {transferEvaluations.length > 0 && (
          <div className="transfer-confidence">
            <h4>Transfer Status</h4>
            {transferEvaluations.map((evaluation, idx) => {
              const badge = getConfidenceBadge(evaluation.confidence);
              return (
                <div key={idx} className="confidence-card" style={{ borderColor: badge.color }}>
                  <div className="confidence-badge" style={{ background: badge.bgColor, color: badge.color }}>
                    {badge.emoji} {badge.text}
                  </div>
                  <div className="confidence-details">
                    <div><strong>{evaluation.from}</strong> → <strong>{evaluation.to}</strong></div>
                    <div>at {evaluation.transferStop}</div>
                    <div className="confidence-reason">{evaluation.reason}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Live Vehicles */}
        {vehicles.length > 0 && (
          <div className="live-vehicles">
            <h4>🚇 {vehicles.length} Trains Nearby</h4>
            <div className="vehicle-list">
              {vehicles.slice(0, 3).map(vehicle => (
                <div key={vehicle.id} className="vehicle-item">
                  {vehicle.attributes.current_status || 'IN_TRANSIT'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pokemon GO Style Map */}
      <div className="map-container">
        <POVMap
          tasks={[]}
          userPosition={userPosition || [42.3601, -71.0589]}
          otherUsers={[]}
          events={events || []}
          onTaskClick={onCompleteTask}
          onEventClick={onReportEvent}
        />
      </div>

      {/* Character Selector Modal */}
      {showCharacterSelect && (
        <CharacterSelector
          selectedCharacter={character}
          onSelect={handleSelectCharacter}
          onClose={() => setShowCharacterSelect(false)}
        />
      )}
    </div>
  );
}

function calculateDistance(pos1, pos2) {
  if (!pos1 || !pos2) return 0;
  const R = 3959;
  const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
  const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default EnhancedGameMap;
