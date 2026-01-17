import { useState, useEffect } from 'react';
import MBTA_API from '../config/mbtaApi';
import { 
  computeWalkMinutes, 
  calculateDistance, 
  getTransferConfidence,
  kmhToMps,
  parseNextDeparture,
  formatPredictionTime
} from '../utils/transitHelpers';
import './TripPlanner.css';

/**
 * TripPlanner Component
 * 
 * Allows selecting origin, transfer (optional), and destination stops
 * Shows predictions and transfer confidence based on walk time and timing
 */
function TripPlanner() {
  const [originRoute, setOriginRoute] = useState(null);
  const [originStop, setOriginStop] = useState(null);
  const [transferStop, setTransferStop] = useState(null);
  const [destinationRoute, setDestinationRoute] = useState(null);
  const [destinationStop, setDestinationStop] = useState(null);
  
  const [routes, setRoutes] = useState([]);
  const [originStops, setOriginStops] = useState([]);
  const [destStops, setDestStops] = useState([]);
  const [transferStops, setTransferStops] = useState([]);
  
  const [predictions, setPredictions] = useState(null);
  const [walkSpeed, setWalkSpeed] = useState(5); // km/h
  const [transferStatus, setTransferStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all routes on mount
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const data = await MBTA_API.getRoutes();
        setRoutes(data.data || []);
      } catch (err) {
        console.error('Error loading routes:', err);
        setError('Failed to load routes');
      }
    };
    loadRoutes();
  }, []);

  // Load stops when origin route changes
  useEffect(() => {
    if (originRoute) {
      const loadOriginStops = async () => {
        try {
          const data = await MBTA_API.getStops({ route: originRoute.id });
          setOriginStops(data.data || []);
        } catch (err) {
          console.error('Error loading origin stops:', err);
        }
      };
      loadOriginStops();
    }
  }, [originRoute]);

  // Load stops when destination route changes
  useEffect(() => {
    if (destinationRoute) {
      const loadDestStops = async () => {
        try {
          const data = await MBTA_API.getStops({ route: destinationRoute.id });
          setDestStops(data.data || []);
        } catch (err) {
          console.error('Error loading destination stops:', err);
        }
      };
      loadDestStops();
    }
  }, [destinationRoute]);

  // When both routes selected, find potential transfer points
  useEffect(() => {
    if (originRoute && destinationRoute && originRoute.id !== destinationRoute.id) {
      const findTransfers = async () => {
        try {
          const [route1Data, route2Data] = await Promise.all([
            MBTA_API.getStops({ route: originRoute.id }),
            MBTA_API.getStops({ route: destinationRoute.id })
          ]);
          
          const route1StopIds = new Set(route1Data.data.map(s => s.id));
          const commonStops = route2Data.data.filter(s => route1StopIds.has(s.id));
          setTransferStops(commonStops);
        } catch (err) {
          console.error('Error finding transfer stops:', err);
        }
      };
      findTransfers();
    }
  }, [originRoute, destinationRoute]);

  // Fetch predictions and calculate transfer confidence
  useEffect(() => {
    if (originStop && destinationStop) {
      const fetchPredictionsAndAnalyze = async () => {
        setLoading(true);
        try {
          const promises = [
            MBTA_API.getPredictions(originStop.id, { route: originRoute?.id })
          ];
          
          if (transferStop) {
            promises.push(
              MBTA_API.getPredictions(transferStop.id, { route: destinationRoute?.id })
            );
          } else {
            promises.push(
              MBTA_API.getPredictions(destinationStop.id, { route: destinationRoute?.id })
            );
          }
          
          const [originPred, destPred] = await Promise.all(promises);
          
          // Parse predictions
          const nextOriginDeparture = parseNextDeparture(originPred);
          const nextDestDeparture = parseNextDeparture(destPred);
          
          if (nextOriginDeparture && nextDestDeparture) {
            // Calculate walking time if transfer stop exists
            let walkMinutes = 0;
            if (transferStop && originStop.attributes?.latitude) {
              const dist = calculateDistance(
                {
                  latitude: originStop.attributes.latitude,
                  longitude: originStop.attributes.longitude
                },
                {
                  latitude: transferStop.attributes?.latitude || originStop.attributes.latitude,
                  longitude: transferStop.attributes?.longitude || originStop.attributes.longitude
                }
              );
              walkMinutes = computeWalkMinutes(dist, kmhToMps(walkSpeed));
            }
            
            // Determine transfer confidence
            const arrivalTime = nextOriginDeparture.arrivalTime || nextOriginDeparture.departureTime;
            const nextDepartTime = nextDestDeparture.departureTime;
            
            if (arrivalTime && nextDepartTime) {
              const status = getTransferConfidence(arrivalTime, nextDepartTime, walkMinutes);
              setTransferStatus(status);
            }
            
            setPredictions({ originPred, destPred, walkMinutes });
          }
        } catch (err) {
          console.error('Error fetching predictions:', err);
          setError('Failed to fetch predictions');
        } finally {
          setLoading(false);
        }
      };
      
      fetchPredictionsAndAnalyze();
      
      // Refresh predictions every 30 seconds
      const interval = setInterval(fetchPredictionsAndAnalyze, 30000);
      return () => clearInterval(interval);
    }
  }, [originStop, transferStop, destinationStop, walkSpeed, originRoute, destinationRoute]);

  const handleRouteSelect = (type, routeId) => {
    const route = routes.find(r => r.id === routeId);
    if (type === 'origin') {
      setOriginRoute(route);
      setOriginStop(null);
    } else {
      setDestinationRoute(route);
      setDestinationStop(null);
    }
  };

  const handleStopSelect = (type, stopId) => {
    const stopsList = type === 'origin' ? originStops : 
                      type === 'transfer' ? transferStops : destStops;
    const stop = stopsList.find(s => s.id === stopId);
    
    if (type === 'origin') {
      setOriginStop(stop);
    } else if (type === 'transfer') {
      setTransferStop(stop);
    } else {
      setDestinationStop(stop);
    }
  };

  return (
    <div className="trip-planner">
      <h2>🚇 Plan Your Trip</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="planner-section">
        <h3>Origin</h3>
        <select 
          value={originRoute?.id || ''} 
          onChange={(e) => handleRouteSelect('origin', e.target.value)}
          className="route-select"
        >
          <option value="">-- Select Route --</option>
          {routes.map(route => (
            <option key={route.id} value={route.id}>
              {route.attributes.long_name}
            </option>
          ))}
        </select>
        
        {originRoute && (
          <select 
            value={originStop?.id || ''} 
            onChange={(e) => handleStopSelect('origin', e.target.value)}
            className="stop-select"
          >
            <option value="">-- Select Stop --</option>
            {originStops.map(stop => (
              <option key={stop.id} value={stop.id}>
                {stop.attributes.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="planner-section">
        <h3>Transfer (Optional)</h3>
        <select 
          value={transferStop?.id || ''} 
          onChange={(e) => handleStopSelect('transfer', e.target.value)}
          className="stop-select"
          disabled={!originRoute || !destinationRoute}
        >
          <option value="">-- No Transfer --</option>
          {transferStops.map(stop => (
            <option key={stop.id} value={stop.id}>
              {stop.attributes.name}
            </option>
          ))}
        </select>
      </div>

      <div className="planner-section">
        <h3>Destination</h3>
        <select 
          value={destinationRoute?.id || ''} 
          onChange={(e) => handleRouteSelect('destination', e.target.value)}
          className="route-select"
        >
          <option value="">-- Select Route --</option>
          {routes.map(route => (
            <option key={route.id} value={route.id}>
              {route.attributes.long_name}
            </option>
          ))}
        </select>
        
        {destinationRoute && (
          <select 
            value={destinationStop?.id || ''} 
            onChange={(e) => handleStopSelect('destination', e.target.value)}
            className="stop-select"
          >
            <option value="">-- Select Stop --</option>
            {destStops.map(stop => (
              <option key={stop.id} value={stop.id}>
                {stop.attributes.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="planner-section">
        <h3>Walking Speed</h3>
        <div className="speed-control">
          <input
            type="range"
            min="3"
            max="6"
            step="0.5"
            value={walkSpeed}
            onChange={(e) => setWalkSpeed(parseFloat(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-value">{walkSpeed} km/h</span>
        </div>
      </div>

      {loading && <div className="loading">Loading predictions...</div>}

      {predictions && !loading && (
        <div className="predictions-section">
          <h3>Next Departures</h3>
          
          <div className="prediction-item">
            <strong>From {originStop?.attributes.name}:</strong>
            <div className="prediction-time">
              {predictions.originPred?.data?.[0]?.attributes?.departure_time 
                ? formatPredictionTime(predictions.originPred.data[0].attributes.departure_time)
                : 'No predictions available'}
            </div>
          </div>

          {transferStop && (
            <div className="prediction-item">
              <strong>Transfer at {transferStop.attributes.name}:</strong>
              <div className="prediction-time">
                {predictions.destPred?.data?.[0]?.attributes?.departure_time 
                  ? formatPredictionTime(predictions.destPred.data[0].attributes.departure_time)
                  : 'No predictions available'}
              </div>
              <div className="walk-time">
                Walking time: {predictions.walkMinutes?.toFixed(1)} min
              </div>
            </div>
          )}

          {!transferStop && destinationStop && (
            <div className="prediction-item">
              <strong>Arriving at {destinationStop.attributes.name}:</strong>
              <div className="prediction-time">
                {predictions.destPred?.data?.[0]?.attributes?.arrival_time 
                  ? formatPredictionTime(predictions.destPred.data[0].attributes.arrival_time)
                  : 'No predictions available'}
              </div>
            </div>
          )}

          {transferStatus && transferStop && (
            <div className={`transfer-status status-${transferStatus.toLowerCase()}`}>
              <strong>Transfer Status:</strong> {transferStatus}
              {transferStatus === 'Likely' && ' ✅'}
              {transferStatus === 'Risky' && ' ⚠️'}
              {transferStatus === 'Unlikely' && ' ❌'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TripPlanner;
