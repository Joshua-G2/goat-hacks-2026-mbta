import { useState, useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useMBTAPolling } from '../services/mbtaService';
import MBTA_API from '../config/mbtaApi';
import Player3DMarker from './Player3DMarker';
import 'leaflet/dist/leaflet.css';
import './GameScreen-SIMPLE.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Route colors
const ROUTE_COLORS = {
  Red: '#DA291C',
  Orange: '#ED8B00',
  Blue: '#003DA5',
  'Green-B': '#00843D',
  'Green-C': '#00843D',
  'Green-D': '#00843D',
  'Green-E': '#00843D',
};

// Decode polyline
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lat * 1e-5, lng * 1e-5]);
  }
  return points;
};

// Player icon - 3D ANIMATED EMOJI
const Player3DIconComponent = () => {
  const markerRef = useRef(null);
  
  useEffect(() => {
    if (markerRef.current) {
      const container = markerRef.current._icon;
      if (container && !container.querySelector('canvas')) {
        const root = createRoot(container);
        root.render(<Player3DMarker />);
      }
    }
  }, []);
  
  return null;
};

const createPlayerIcon = () => {
  return L.divIcon({
    className: 'player-icon-3d',
    html: '<div class="player-3d-container" style="width: 80px; height: 80px;"></div>',
    iconSize: [80, 80],
    iconAnchor: [40, 40]
  });
};

// Center map on position
function LocationMarker({ position }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  
  useEffect(() => {
    if (position && !hasCenteredRef.current) {
      map.flyTo(position, 15, { duration: 1 });
      hasCenteredRef.current = true;
    }
  }, [position, map]);

  return null;
}

function GameScreen() {
  // GPS
  const { position, status: gpsStatus } = useGPSTracking();
  const playerMarkerRef = useRef(null);
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [startStation, setStartStation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [xp, setXp] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isOnTrain, setIsOnTrain] = useState(false);
  const [currentTrain, setCurrentTrain] = useState(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const lastPositionRef = useRef(null);
  const [nearbyTrains, setNearbyTrains] = useState([]);
  const [waitingForTrain, setWaitingForTrain] = useState(true);
  const [canOffboard, setCanOffboard] = useState(false);
  const [trainPredictions, setTrainPredictions] = useState([]);
  const predictionIntervalRef = useRef(null);
  const [showTrainArrival, setShowTrainArrival] = useState(false);
  const [showWaveGoodbye, setShowWaveGoodbye] = useState(false);
  const [showVictoryJump, setShowVictoryJump] = useState(false);
  const [arrivingTrain, setArrivingTrain] = useState(null);
  
  // Map data
  const [routeShapes, setRouteShapes] = useState([]);
  const [stops, setStops] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Live trains
  const { vehicles } = useMBTAPolling({
    routeIds: ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'],
    interval: 8000,
    enabled: true
  });

  // Load map data once
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load stops
        const stopsData = await MBTA_API.getStops({ location_type: 1 }, 'route');
        if (stopsData.data) {
          setStops(stopsData.data);
        }

        // Load route shapes
        const targetRoutes = ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];
        const shapes = [];
        
        for (const routeId of targetRoutes) {
          const shapeRes = await MBTA_API.getShapes(routeId);
          if (shapeRes.data && shapeRes.data.length > 0) {
            const shape = shapeRes.data[0];
            const positions = decodePolyline(shape.attributes.polyline);
            shapes.push({
              id: routeId,
              positions: positions,
              color: ROUTE_COLORS[routeId] || '#333'
            });
          }
        }
        setRouteShapes(shapes);
      } catch (err) {
        console.error("Failed to load map data:", err);
      }
    };
    loadMapData();
  }, []);

  // Track distance ONLY when on train
  useEffect(() => {
    if (!isOnTrain || !currentTrain || gameWon) return;
    
    if (lastPositionRef.current && currentTrain.latitude && currentTrain.longitude) {
      const R = 6371; // Earth radius in km
      const dLat = (currentTrain.latitude - lastPositionRef.current.lat) * Math.PI / 180;
      const dLon = (currentTrain.longitude - lastPositionRef.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastPositionRef.current.lat * Math.PI / 180) * Math.cos(currentTrain.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceKm = R * c;
      const distanceMiles = distanceKm * 0.621371;
      
      if (distanceMiles > 0.001) { // Only count significant movement
        setDistanceTraveled(prev => prev + distanceMiles);
      }
    }
    
    if (currentTrain.latitude && currentTrain.longitude) {
      lastPositionRef.current = { lat: currentTrain.latitude, lng: currentTrain.longitude };
    }
  }, [currentTrain, isOnTrain, gameWon]);

  // Fetch live predictions for start station
  useEffect(() => {
    console.log('[GameScreen] Predictions useEffect triggered. gameStarted:', gameStarted, 'startStation:', startStation?.id, 'destination:', destination?.id, 'isOnTrain:', isOnTrain);
    
    // Clear any existing interval
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }

    // Only fetch if waiting for train (not on train yet)
    if (!gameStarted || !startStation || !destination || isOnTrain) {
      setTrainPredictions([]);
      return;
    }
    
    const fetchPredictions = async () => {
      try {
        console.log('[GameScreen] Fetching predictions for station:', startStation.id);
        const response = await MBTA_API.getPredictions(startStation.id);
        console.log('[GameScreen] API Response:', response);
        
        if (response.data) {
          const predictions = response.data
            .filter(pred => pred.attributes.arrival_time)
            .map(pred => ({
              id: pred.id,
              routeId: pred.relationships?.route?.data?.id || 'Unknown',
              arrivalTime: pred.attributes.arrival_time,
              minutesAway: Math.round((new Date(pred.attributes.arrival_time) - new Date()) / 60000),
              direction: pred.attributes.direction_id,
              status: pred.attributes.status
            }))
            .filter(pred => pred.minutesAway >= 0 && pred.minutesAway <= 30) // Only show trains arriving within 30 min
            .sort((a, b) => a.minutesAway - b.minutesAway)
            .slice(0, 5);
          
          console.log('[GameScreen] Found predictions:', predictions.length, predictions);
          setTrainPredictions(predictions);
        } else {
          console.log('[GameScreen] No prediction data in response');
          setTrainPredictions([]);
        }
      } catch (err) {
        console.error('Failed to fetch predictions:', err);
        setTrainPredictions([]);
      }
    };
    
    // Initial fetch
    fetchPredictions();
    
    // Set up interval for continuous updates
    predictionIntervalRef.current = setInterval(fetchPredictions, 15000); // Refresh every 15 seconds
    
    // Cleanup function
    return () => {
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current);
        predictionIntervalRef.current = null;
      }
    };
  }, [gameStarted, startStation?.id, destination?.id, isOnTrain]);

  // Detect trains near start station (within 100m)
  useEffect(() => {
    if (!gameStarted || !startStation || !destination || isOnTrain) return;
    
    const findNearbyTrains = () => {
      if (!vehicles || vehicles.length === 0) {
        setNearbyTrains([]);
        return;
      }
      
      const startLat = startStation.attributes.latitude;
      const startLng = startStation.attributes.longitude;
      const R = 6371000; // Earth radius in meters
      
      const nearby = vehicles.filter(vehicle => {
        if (!vehicle.latitude || !vehicle.longitude) return false;
        
        const dLat = (vehicle.latitude - startLat) * Math.PI / 180;
        const dLon = (vehicle.longitude - startLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(startLat * Math.PI / 180) * Math.cos(vehicle.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance < 100; // Within 100 meters
      }).map(vehicle => ({
        ...vehicle,
        distance: (() => {
          const dLat = (vehicle.latitude - startLat) * Math.PI / 180;
          const dLon = (vehicle.longitude - startLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(startLat * Math.PI / 180) * Math.cos(vehicle.latitude * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return (R * c).toFixed(0);
        })()
      }));
      
      setNearbyTrains(nearby);
      setWaitingForTrain(nearby.length === 0);
      
      // Trigger arrival animation when first train arrives
      if (nearby.length > 0 && nearbyTrains.length === 0) {
        setArrivingTrain(nearby[0]);
        setShowTrainArrival(true);
        setTimeout(() => setShowTrainArrival(false), 5000);
      }
    };
    
    findNearbyTrains();
  }, [vehicles, gameStarted, startStation, destination, isOnTrain]);

  // Check if train reached destination (within 100m)
  useEffect(() => {
    if (!isOnTrain || !currentTrain || !destination) return;
    
    const checkDestinationProximity = () => {
      if (!currentTrain.latitude || !currentTrain.longitude) return;
      
      const destLat = destination.attributes.latitude;
      const destLng = destination.attributes.longitude;
      const R = 6371000; // Earth radius in meters
      
      const dLat = (currentTrain.latitude - destLat) * Math.PI / 180;
      const dLon = (currentTrain.longitude - destLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(destLat * Math.PI / 180) * Math.cos(currentTrain.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      setCanOffboard(distance < 100); // Can offboard within 100m of destination
    };
    
    checkDestinationProximity();
  }, [currentTrain, isOnTrain, destination]);

  // Check win condition (simple: within 100m of destination)
  useEffect(() => {
    if (!gameStarted || !startStation || !destination || !position || gameWon) return;
    
    const checkWin = () => {
      const destLat = destination.attributes.latitude;
      const destLng = destination.attributes.longitude;
      
      // Simple distance check (rough km calculation)
      const R = 6371; // Earth radius in km
      const dLat = (destLat - position.lat) * Math.PI / 180;
      const dLon = (destLng - position.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(position.lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c * 1000; // meters
      
      if (distance < 100) {
        setGameWon(true);
      }
    };
    
    checkWin();
  }, [position, destination, gameStarted, gameWon]);

  // Search for stops
  useEffect(() => {
    const doSearch = () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      
      const filtered = stops.filter(stop => 
        stop.attributes.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5);
      
      setSearchResults(filtered);
    };
    
    doSearch();
  }, [searchTerm, stops]);

  const handleStartGame = () => {
    console.log('[GameScreen] START GAME clicked');
    setGameStarted(true);
  };

  const handleBoardTrain = (train) => {
    console.log('[GameScreen] Boarding train:', train.routeId);
    setShowWaveGoodbye(true);
    setTimeout(() => {
      setShowWaveGoodbye(false);
      setIsOnTrain(true);
      setCurrentTrain(train);
      setWaitingForTrain(false);
      setNearbyTrains([]);
      lastPositionRef.current = { lat: train.latitude, lng: train.longitude };
    }, 2000);
  };

  const handleOffboard = () => {
    console.log('[GameScreen] Off-boarding at destination');
    setShowVictoryJump(true);
    setTimeout(() => {
      setIsOnTrain(false);
      const points = Math.floor(distanceTraveled * 100); // 100 points per mile
      setTotalPoints(points);
      setGameWon(true);
      setShowVictoryJump(false);
    }, 3000);
  };

  const handleSelectStartStation = (stop) => {
    console.log('[GameScreen] Selected START station:', stop.id, stop.attributes.name, stop);
    setStartStation(stop);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSelectDestination = (stop) => {
    console.log('[GameScreen] Selected DESTINATION:', stop.id, stop.attributes.name, stop);
    setDestination(stop);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRestart = () => {
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    setGameStarted(false);
    setStartStation(null);
    setDestination(null);
    setXp(0);
    setGameWon(false);
    setIsOnTrain(false);
    setCurrentTrain(null);
    setDistanceTraveled(0);
    setTotalPoints(0);
    lastPositionRef.current = null;
    setNearbyTrains([]);
    setWaitingForTrain(true);
    setCanOffboard(false);
    setTrainPredictions([]);
  };

  const normalizePosition = (value) => {
    if (!value) return null;
    if (typeof value.lat === 'number' && typeof value.lng === 'number') {
      return { lat: value.lat, lng: value.lng };
    }
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
      return { lat: value.latitude, lng: value.longitude };
    }
    return null;
  };

  const normalizedPosition = normalizePosition(position);
  const defaultCenter = [42.3601, -71.0589];
  const mapCenter = normalizedPosition ? [normalizedPosition.lat, normalizedPosition.lng] : defaultCenter;

  // Render 3D player marker when it mounts
  useEffect(() => {
    if (playerMarkerRef.current && normalizedPosition) {
      const markerElement = playerMarkerRef.current;
      const leafletMarker = markerElement._leaflet_id ? L.Util.stamp(markerElement) : null;
      
      if (markerElement && markerElement._icon) {
        const container = markerElement._icon.querySelector('.player-3d-container');
        if (container && !container.querySelector('canvas')) {
          const root = createRoot(container);
          root.render(<Player3DMarker />);
        }
      }
    }
  }, [normalizedPosition, playerMarkerRef.current]);

  return (
    <div className="game-screen-simple">
      {/* Train Arrival Animation */}
      {showTrainArrival && arrivingTrain && startStation && destination && (
        <div className="animation-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.5s ease-in'
        }}>
          <div style={{fontSize: '120px', animation: 'trainSlide 2s ease-out'}}>🚆</div>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: ROUTE_COLORS[arrivingTrain.routeId] || '#fff',
            marginTop: '20px',
            textAlign: 'center',
            animation: 'pulse 1s infinite'
          }}>
            {arrivingTrain.routeId} Line Arriving!
          </div>
          <div style={{fontSize: '32px', color: '#fbbf24', marginTop: '10px'}}>
            From {startStation.attributes.name}
          </div>
          <div style={{fontSize: '32px', color: '#10b981', marginTop: '5px'}}>
            To {destination.attributes.name}
          </div>
        </div>
      )}

      {/* Wave Goodbye Animation */}
      {showWaveGoodbye && (
        <div className="animation-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{fontSize: '150px', animation: 'wave 0.5s ease-in-out 3'}}>👋</div>
          <div style={{fontSize: '42px', color: '#fff', marginTop: '20px', fontWeight: 'bold'}}>
            All Aboard!
          </div>
        </div>
      )}

      {/* Victory Jump Animation */}
      {showVictoryJump && (
        <div className="animation-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{fontSize: '150px', animation: 'jump 0.6s ease-in-out 4'}}>🤸</div>
          <div style={{fontSize: '48px', color: '#10b981', marginTop: '20px', fontWeight: 'bold'}}>
            Destination Reached!
          </div>
        </div>
      )}

      {/* Top HUD - Always Visible */}
      <div className="hud-top">
        <div className="hud-item">
          <strong>Status:</strong> {isOnTrain ? `🚆 Riding ${currentTrain?.routeId}` : waitingForTrain ? '⏳ Waiting for train' : '🚉 Train available!'}
        </div>
        <div className="hud-item">
          <strong>Distance:</strong> {distanceTraveled.toFixed(2)} mi
        </div>
        <div className="hud-item">
          <strong>Live Trains:</strong> {vehicles.length}
        </div>
      </div>

      {/* Win Screen */}
      {gameWon && (
        <div className="win-overlay">
          <div className="win-box">
            <h1>🎉 YOU WIN! 🎉</h1>
            <p className="win-xp">Distance Traveled: {distanceTraveled.toFixed(2)} miles</p>
            <p className="win-xp">Total Points: {totalPoints}</p>
            <button className="btn-primary" onClick={handleRestart}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="map-container-simple">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          
          <LocationMarker position={normalizedPosition} />

          {/* Route lines - ALWAYS VISIBLE */}
          <Pane name="routes" style={{ zIndex: 400 }}>
            {routeShapes.map((shape) => (
              <Polyline
                key={shape.id}
                positions={shape.positions}
                pathOptions={{
                  color: shape.color,
                  weight: 5,
                  opacity: 0.7
                }}
              />
            ))}
          </Pane>

          {/* Stations */}
          <Pane name="stations" style={{ zIndex: 450 }}>
            {stops.map((stop) => {
              const lat = stop?.attributes?.latitude;
              const lng = stop?.attributes?.longitude;
              if (typeof lat !== 'number' || typeof lng !== 'number') return null;
              return (
                <Circle
                  key={stop.id}
                  center={[lat, lng]}
                  radius={15}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: '#334155',
                    fillOpacity: 1
                  }}
                />
              );
            })}
          </Pane>

          {/* Start station marker */}
          {startStation &&
            typeof startStation?.attributes?.latitude === 'number' &&
            typeof startStation?.attributes?.longitude === 'number' && (
            <Marker
              position={[startStation.attributes.latitude, startStation.attributes.longitude]}
              icon={L.divIcon({
                className: 'start-marker',
                html: `<div style="font-size: 48px;">🚩</div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 48]
              })}
            />
          )}

          {/* Destination marker */}
          {destination &&
            typeof destination?.attributes?.latitude === 'number' &&
            typeof destination?.attributes?.longitude === 'number' && (
            <Marker
              position={[destination.attributes.latitude, destination.attributes.longitude]}
              icon={L.divIcon({
                className: 'dest-marker',
                html: `<div style="font-size: 48px;">🏁</div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 48]
              })}
            />
          )}

          {/* Player marker - 3D ANIMATED - shows on train when boarded */}
          {normalizedPosition && (
            <Marker
              ref={playerMarkerRef}
              position={
                isOnTrain && currentTrain && currentTrain.latitude && currentTrain.longitude
                  ? [currentTrain.latitude, currentTrain.longitude]
                  : [normalizedPosition.lat, normalizedPosition.lng]
              }
              icon={createPlayerIcon()}
              zIndexOffset={1000}
            />
          )}

          {/* Live trains - VISIBLE */}
          <Pane name="trains" style={{ zIndex: 500 }}>
            {vehicles.map((vehicle) => {
              if (!vehicle.latitude || !vehicle.longitude) return null;
              const color = ROUTE_COLORS[vehicle.routeId] || '#666';
              return (
                <Circle
                  key={vehicle.id}
                  center={[vehicle.latitude, vehicle.longitude]}
                  radius={50}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 3
                  }}
                />
              );
            })}
          </Pane>
        </MapContainer>
      </div>

      {/* Bottom Controls - Simple and Clear */}
      <div className="controls-bottom">
        {!gameStarted && (
          <button className="btn-primary btn-large" onClick={handleStartGame}>
            🎮 START GAME
          </button>
        )}

        {gameStarted && !startStation && (
          <div className="destination-picker">
            <h3>Select Your Starting Station:</h3>
            <input
              type="text"
              placeholder="Search stations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-simple"
              autoFocus
            />
            <div className="search-results">
              {searchResults.map(stop => (
                <div
                  key={stop.id}
                  className="search-result-item"
                  onClick={() => handleSelectStartStation(stop)}
                >
                  <span className="stop-icon">🚩</span>
                  <span className="stop-name">{stop.attributes.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameStarted && startStation && !destination && (
          <div className="destination-picker">
            <h3>Select Your Destination:</h3>
            <input
              type="text"
              placeholder="Search stations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-simple"
              autoFocus
            />
            <div className="search-results">
              {searchResults.map(stop => (
                <div
                  key={stop.id}
                  className="search-result-item"
                  onClick={() => handleSelectDestination(stop)}
                >
                  <span className="stop-icon">🏁</span>
                  <span className="stop-name">{stop.attributes.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameStarted && startStation && destination && !gameWon && !isOnTrain && (
          <div className="game-info">
            <p><strong>Start:</strong> {startStation.attributes.name}</p>
            <p><strong>Destination:</strong> {destination.attributes.name}</p>
            <p style={{fontSize: '0.8em', opacity: 0.7}}>Debug: {trainPredictions.length} predictions | {nearbyTrains.length} nearby trains</p>
            
            {/* Show incoming trains if we have predictions */}
            {trainPredictions.length > 0 && (
              <div style={{marginTop: '15px', background: 'rgba(251, 191, 36, 0.1)', padding: '12px', borderRadius: '8px'}}>
                <h4 style={{margin: '0 0 10px 0', color: '#fbbf24'}}>📋 Incoming Trains:</h4>
                {trainPredictions.map(pred => (
                  <div key={pred.id} style={{
                    padding: '8px',
                    margin: '5px 0',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    borderLeft: `4px solid ${ROUTE_COLORS[pred.routeId] || '#666'}`
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span><strong>{pred.routeId} Line</strong></span>
                      <span style={{color: '#10b981', fontWeight: 'bold'}}>
                        {pred.minutesAway === 0 ? 'Arriving now!' : `${pred.minutesAway} min`}
                      </span>
                    </div>
                    <div style={{fontSize: '0.85em', opacity: 0.8, marginTop: '4px'}}>
                      {pred.status || 'On time'}
                    </div>
                  </div>
                ))}
                <p style={{fontSize: '0.9em', marginTop: '10px', opacity: 0.9}}>
                  💡 Wait for train to arrive at station, then click BOARD
                </p>
              </div>
            )}
            
            {/* Show waiting message if no predictions yet */}
            {trainPredictions.length === 0 && nearbyTrains.length === 0 && (
              <p style={{color: '#fbbf24', fontWeight: 'bold', marginTop: '10px'}}>
                ⏳ Loading train predictions for {startStation.attributes.name}...
              </p>
            )}
            
            {/* Show trains at station with BOARD button */}
            {nearbyTrains.length > 0 && (
              <div style={{marginTop: '15px'}}>
                <h4 style={{margin: '5px 0 15px 0', color: '#10b981', fontSize: '1.2em'}}>🚆 TRAINS AT STATION - BOARD NOW!</h4>
                {nearbyTrains.map(train => (
                  <div key={train.id} style={{
                    background: ROUTE_COLORS[train.routeId] || '#666',
                    padding: '15px',
                    margin: '10px 0',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div>
                      <strong style={{fontSize: '1.2em'}}>{train.routeId} Line 🚆</strong>
                      <div style={{fontSize: '0.9em', opacity: 0.9, marginTop: '5px'}}>
                        📍 At {startStation.attributes.name}
                      </div>
                      <div style={{fontSize: '0.85em', opacity: 0.8}}>
                        {train.distance}m from platform
                      </div>
                    </div>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleBoardTrain(train)}
                      style={{
                        padding: '12px 24px',
                        fontSize: '1.1em',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        animation: 'pulse 1.5s infinite',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
                      }}
                    >
                      🚪 BOARD
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button className="btn-secondary" onClick={handleRestart} style={{marginTop: '15px'}}>
              Restart
            </button>
          </div>
        )}

        {gameStarted && isOnTrain && !gameWon && (
          <div className="game-info">
            <p><strong>Riding:</strong> {currentTrain?.routeId} Line 🚆</p>
            <p><strong>Destination:</strong> {destination.attributes.name}</p>
            <p><strong>Journey:</strong> {distanceTraveled.toFixed(2)} miles traveled</p>
            
            {canOffboard && (
              <button 
                className="btn-primary btn-large" 
                onClick={handleOffboard}
                style={{marginTop: '15px', background: '#10b981', animation: 'pulse 2s infinite'}}
              >
                🚪 OFF-BOARD (Arrived at Destination!)
              </button>
            )}
            
            {!canOffboard && (
              <p style={{color: '#fbbf24', marginTop: '10px'}}>
                🚆 Stay on train until you reach {destination.attributes.name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(GameScreen);
