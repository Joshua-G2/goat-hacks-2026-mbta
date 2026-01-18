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
function TripPlanner({ 
  fallbackStations = [], 
  selectedOrigin,
  selectedDestination,
  selectedTransfer,
  onOriginChange = () => {},
  onDestinationChange = () => {},
  onTransferChange = () => {},
  onOriginRouteChange = () => {},
  onDestinationRouteChange = () => {}
}) {
  const [originRoute, setOriginRoute] = useState(null);
  const [destinationRoute, setDestinationRoute] = useState(null);
  
  const [routes, setRoutes] = useState([]);
  const [originStops, setOriginStops] = useState([]);
  const [destStops, setDestStops] = useState([]);
  const [transferStops, setTransferStops] = useState([]);
  
  const [predictions, setPredictions] = useState(null);
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
        setError('Failed to load routes; loading built-in destinations.');
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
    if (originRoute && destinationRoute) {
      if (originRoute.id === destinationRoute.id) {
        setTransferStops([]);
        onTransferChange(null);
        return;
      }

      const findTransfers = async () => {
        try {
          const [route1Data, route2Data] = await Promise.all([
            MBTA_API.getStops({ route: originRoute.id }),
            MBTA_API.getStops({ route: destinationRoute.id })
          ]);
          
          const route1StopIds = new Set(route1Data.data.map(s => s.id));
          const commonStops = route2Data.data.filter(s => route1StopIds.has(s.id));
          setTransferStops(commonStops);
          if (commonStops.length === 1) {
            onTransferChange(commonStops[0]);
          }
        } catch (err) {
          console.error('Error finding transfer stops:', err);
        }
      };
      findTransfers();
    }
  }, [originRoute, destinationRoute, onTransferChange]);

  // Fetch predictions and calculate transfer confidence
  useEffect(() => {
    if (selectedOrigin && selectedDestination) {
      const fetchPredictionsAndAnalyze = async () => {
        setLoading(true);
        try {
          const promises = [
            MBTA_API.getPredictions(selectedOrigin.id, { route: originRoute?.id })
          ];
          
          if (selectedTransfer) {
            promises.push(
              MBTA_API.getPredictions(selectedTransfer.id, { route: destinationRoute?.id })
            );
          } else {
            promises.push(
              MBTA_API.getPredictions(selectedDestination.id, { route: destinationRoute?.id })
            );
          }
          
          const [originPred, destPred] = await Promise.all(promises);
          
          // Parse predictions
          const nextOriginDeparture = parseNextDeparture(originPred);
          const nextDestDeparture = parseNextDeparture(destPred);
          
          if (nextOriginDeparture && nextDestDeparture) {
            // Calculate walking time if transfer stop exists
            let walkMinutes = 0;
            if (selectedTransfer && selectedOrigin.attributes?.latitude) {
              const dist = calculateDistance(
                {
                  latitude: selectedOrigin.attributes.latitude,
                  longitude: selectedOrigin.attributes.longitude
                },
                {
                  latitude: selectedTransfer.attributes?.latitude || selectedOrigin.attributes.latitude,
                  longitude: selectedTransfer.attributes?.longitude || selectedOrigin.attributes.longitude
                }
              );
              walkMinutes = computeWalkMinutes(dist, kmhToMps(5));
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
  }, [selectedOrigin, selectedTransfer, selectedDestination, originRoute, destinationRoute]);

  const handleRouteSelect = (type, routeId) => {
    const route = routes.find(r => r.id === routeId);
    if (type === 'origin') {
      setOriginRoute(route);
      onOriginRouteChange(route?.id || null);
      onOriginChange(null);
    } else {
      setDestinationRoute(route);
      onDestinationRouteChange(route?.id || null);
      onDestinationChange(null);
    }
  };

  const handleFallbackStopSelect = (type, stopId) => {
    const stop = fallbackStations.find(s => s.id === stopId);
    if (!stop) return;
    const normalizedStop = {
      id: stop.id,
      attributes: {
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude
      }
    };
    if (type === 'origin') {
      onOriginChange(normalizedStop);
    } else {
      onDestinationChange(normalizedStop);
    }
  };

  const handleStopSelect = (type, stopId) => {
    const stopsList = type === 'origin' ? originStops : 
                      type === 'transfer' ? transferStops : destStops;
    const stop = stopsList.find(s => s.id === stopId);
    
    if (type === 'origin') {
      onOriginChange(stop);
    } else if (type === 'transfer') {
      onTransferChange(stop);
    } else {
      onDestinationChange(stop);
    }
  };

  return (
    <div className="trip-planner">
      <h2>🚇 Plan Your Trip</h2>
      
      {error && <div className="error-message">{error}</div>}

      {error && fallbackStations.length > 0 && (
        <>
          <div className="planner-section">
            <h3>Origin</h3>
            <select
              value={selectedOrigin?.id || ''}
              onChange={(e) => handleFallbackStopSelect('origin', e.target.value)}
              className="stop-select"
            >
              <option value="">-- Select Station --</option>
              {fallbackStations.map(stop => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="planner-section">
            <h3>Destination</h3>
            <select
              value={selectedDestination?.id || ''}
              onChange={(e) => handleFallbackStopSelect('destination', e.target.value)}
              className="stop-select"
            >
              <option value="">-- Select Station --</option>
              {fallbackStations.map(stop => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      
      {!error && (
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
            value={selectedOrigin?.id || ''} 
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
      )}

      {!error && (
        <div className="planner-section">
          <h3>Transfer (Optional)</h3>
          <select 
            value={selectedTransfer?.id || ''} 
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
      )}

      {!error && (
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
              value={selectedDestination?.id || ''} 
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
      )}
    </div>
  );
}

export default TripPlanner;
