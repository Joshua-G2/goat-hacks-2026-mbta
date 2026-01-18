import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useMBTAPolling } from '../services/mbtaService';
import MBTA_API from '../config/mbtaApi';
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

// Player icon - BIG and VISIBLE
const createPlayerIcon = () => {
  return L.divIcon({
    className: 'player-icon-simple',
    html: `<div style="
      width: 60px; 
      height: 60px; 
      background: #FF4500; 
      border: 4px solid white; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    ">🧍</div>`,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
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
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [destination, setDestination] = useState(null);
  const [xp, setXp] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  
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

  // XP increases every second when game is running
  useEffect(() => {
    if (!gameStarted || gameWon) return;
    
    const interval = setInterval(() => {
      setXp(prev => prev + 10);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStarted, gameWon]);

  // Check win condition (simple: within 100m of destination)
  useEffect(() => {
    if (!gameStarted || !destination || !position || gameWon) return;
    
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
    setGameStarted(true);
  };

  const handleSelectDestination = (stop) => {
    setDestination(stop);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRestart = () => {
    setGameStarted(false);
    setDestination(null);
    setXp(0);
    setGameWon(false);
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

  return (
    <div className="game-screen-simple">
      {/* Top HUD - Always Visible */}
      <div className="hud-top">
        <div className="hud-item">
          <strong>GPS:</strong> {gpsStatus}
        </div>
        <div className="hud-item xp-display">
          <strong>⭐ XP:</strong> {xp}
        </div>
        <div className="hud-item">
          <strong>Trains:</strong> {vehicles.length}
        </div>
      </div>

      {/* Win Screen */}
      {gameWon && (
        <div className="win-overlay">
          <div className="win-box">
            <h1>🎉 YOU WIN! 🎉</h1>
            <p className="win-xp">Final XP: {xp}</p>
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

          {/* Player marker - BIG */}
          {normalizedPosition && (
            <Marker
              position={[normalizedPosition.lat, normalizedPosition.lng]}
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

        {gameStarted && !destination && (
          <div className="destination-picker">
            <h3>Select Destination:</h3>
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
                  <span className="stop-icon">🚉</span>
                  <span className="stop-name">{stop.attributes.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameStarted && destination && !gameWon && (
          <div className="game-info">
            <p><strong>Destination:</strong> {destination.attributes.name}</p>
            <p><strong>Status:</strong> Game Running - Get to your destination!</p>
            <button className="btn-secondary" onClick={handleRestart}>
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameScreen;
