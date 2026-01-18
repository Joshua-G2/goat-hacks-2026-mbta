import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useMBTAPolling, mbtaService } from '../services/mbtaService';
import { WalkingProviderManager } from '../services/walkingProvider';
import MBTA_API from '../config/mbtaApi';
import 'leaflet/dist/leaflet.css';
import './GameScreen.css';

// Animation Variants
const springTransition = { type: "spring", stiffness: 300, damping: 30 };
const softSpring = { type: "spring", stiffness: 200, damping: 25 };

const bottomCardVariants = {
  collapsed: { height: "30vh", y: 0 },
  expanded: { height: "65vh", y: 0 },
  hidden: { y: "100%" }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 200 } }
};

const alertVariants = {
  initial: { opacity: 0, x: 20, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const questItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, height: 0, marginBottom: 0 }
};

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Standard MBTA Route Colors for lines
export const ROUTE_COLORS = {
  Red: '#DA291C',
  Orange: '#ED8B00',
  Blue: '#003DA5',
  'Green-B': '#00843D',
  'Green-C': '#00843D',
  'Green-D': '#00843D',
  'Green-E': '#00843D',
  Mattapan: '#DA291C'
};

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

// Constants
const DAILY_TASKS = [
  { id: 1, text: "Discover 3 new stops", progress: 1, total: 3, reward: 50 },
  { id: 2, text: "Walk 1 mile", progress: 0.4, total: 1.0, reward: 100 },
  { id: 3, text: "Ride the Green Line", progress: 0, total: 1, reward: 150 }
];

/**
 * Player Avatar Marker - With idle animation and shadow
 */
const createPlayerIcon = () => {
  return L.divIcon({
    className: 'player-avatar-container',
    html: `
      <div class="player-shadow-pulse"></div>
      <div class="player-avatar">
        <div class="player-heading-arrow"></div>
        <div class="player-sprite">🏃</div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 45]
  });
};

// Component to center map on user location
function LocationMarker({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);

  return null;
}

/**
 * Mission Header - Always visible inputs (Frame 2 style)
 */
function MissionHeader({ gameState, destination, onDestClick, gpsStatus }) {
  const isLocked = gameState === GAME_STATES.MISSION_LOCKED || gameState === GAME_STATES.LIVE_PLAY;
  
  return (
    <motion.div 
      className="mission-header"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={springTransition}
    >
      <div className="mission-input-group">
        <div className="input-row">
          <span className="input-icon">📍</span>
          <div className="input-fake">Current Location</div>
          <div className={`status-dot-small status-${gpsStatus}`} />
        </div>
        <div className="connector-line" />
        <div 
          className={`input-row dest-row ${isLocked ? 'locked' : ''}`}
          onClick={!isLocked ? onDestClick : undefined}
        >
          <span className="input-icon">🏁</span>
          <div className={`input-fake ${!destination ? 'placeholder' : ''}`}>
            {destination || "Set Destination"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * XP Overlay - Floating feedback
 */
function XPOverlay({ xpGained, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="xp-float-container"
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -50, scale: 1.2 }}
          exit={{ opacity: 0 }}
        >
          <div className="xp-value">+{xpGained} XP</div>
          <div className="xp-label">ROUTE MASTER</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
/**
 * Confidence Badge - Hero element showing trip confidence
 */
function ConfidenceBadge({ level }) {
  const configs = {
    likely: { icon: '🛡️', label: 'Likely', color: '#22c55e' },
    risky: { icon: '⚠️', label: 'Risky', color: '#f59e0b' },
    unlikely: { icon: '🚨', label: 'Unlikely', color: '#ef4444' },
    unknown: { icon: '🔮', label: 'Unknown', color: '#a855f7' }
  };
  
  const config = configs[level] || configs.unknown;
  const isWarn = level === 'risky' || level === 'unlikely';

  return (
    <motion.div 
      className="confidence-badge"
      animate={{ 
        borderColor: config.color,
        scale: isWarn ? [1, 1.05, 1] : 1
      }}
      transition={{ 
        borderColor: { duration: 0.5 },
        scale: { duration: 2, repeat: isWarn ? Infinity : 0, repeatType: "reverse" }
      }}
    >
      <div className="confidence-icon">{config.icon}</div>
      <motion.div 
        className="confidence-label" 
        animate={{ color: config.color }}
      >
        {config.label}
      </motion.div>
    </motion.div>
  );
}

/**
 * Quest Node - Individual step in the journey
 */
function QuestNode({ type, title, subtext, status }) {
  const icons = {
    walk: '👣',
    board: '🚆',
    ride: '➡️',
    transfer: '🔄'
  };
  
  const statusClass = status === 'active' ? 'quest-node-active' : 
                     status === 'completed' ? 'quest-node-completed' : '';
  
  return (
    <motion.div 
      className={`quest-node ${statusClass}`}
      variants={questItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout // Smooth reordering
    >
      <div className="quest-icon">{icons[type] || '📍'}</div>
      <div className="quest-content">
        <div className="quest-title">{title}</div>
        {subtext && <div className="quest-subtext">{subtext}</div>}
      </div>
      <div className="quest-status">
        <AnimatePresence mode="wait">
          {status === 'completed' && (
            <motion.span 
              key="check"
              className="checkmark"
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              transition={{ type: "spring" }}
            >
              ✓
            </motion.span>
          )}
          {status === 'active' && (
            <motion.div 
              key="pulse"
              className="pulse-dot" 
              animate={{ opacity: [1, 0.5, 1], scale: [1, 0.8, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Bottom Game Card - Primary interaction zone
 */
function BottomGameCard({ 
  gameState,
  destination,
  confidence,
  quests,
  onAction,
  dailyTasks = []
}) {
  const isExploration = gameState === GAME_STATES.EXPLORATION;
  const isPreview = gameState === GAME_STATES.MISSION_PREVIEW;
  
  return (
    <motion.div 
      className={`bottom-card ${isExploration ? 'exploration-mode' : ''}`}
      variants={bottomCardVariants}
      initial="collapsed"
      animate={isExploration ? "collapsed" : "expanded"}
      transition={springTransition}
    >
      <div className="card-header" onClick={() => {}}>
        <div className="header-left">
          <span className="objective-icon">
            {isExploration ? '🧭' : '🎯'}
          </span>
          <motion.div layout>
            <div className="objective-title">
              {isExploration ? 'Exploration Mode' : 'Mission Objective'}
            </div>
            <div className="objective-subtitle">
              {isExploration ? 'Select a destination to begin' : destination}
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="card-body">
        <AnimatePresence mode="wait">
          {isExploration && (
            <motion.div
              key="explore-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
               <button
                className="action-btn-primary pulse-btn"
                onClick={onAction}
              >
                🎯 SET MISSION
              </button>

              <div className="daily-tasks-container">
                <div className="daily-tasks-header">Daily Tasks</div>
                {dailyTasks.map(task => (
                  <div key={task.id} className="daily-task-item">
                    <div className="task-info">
                      <span className="task-text">{task.text}</span>
                      <div className="task-progress-bar">
                         <div 
                           className="task-progress-fill" 
                           style={{ width: `${(task.progress / task.total) * 100}%` }}
                         />
                      </div>
                    </div>
                    <span className="task-reward">+{task.reward} XP</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {isPreview && (
            <motion.div
              key="preview-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="preview-content"
            >
              <div className="mission-stats-row">
                <ConfidenceBadge level={confidence} />
                <div className="xp-est">
                  <span className="xp-icon">⭐</span>
                  <span className="xp-val">500 XP</span>
                </div>
              </div>
              
              <button className="action-btn-primary lock-btn" onClick={onAction}>
                START MISSION
              </button>
            </motion.div>
          )}

          {(gameState === GAME_STATES.LIVE_PLAY || gameState === GAME_STATES.MISSION_LOCKED) && (
            <motion.div
              key="live-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="active-mission-content"
            >
               <div className="quest-steps">
                 {quests && quests.map((q, i) => (
                    <QuestNode key={i} {...q} />
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Destination Selection Overlay (Frame 4)
 */
function DestinationOverlay({ visible, onClose, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial famous stops
  useEffect(() => {
    if (visible && !searchTerm) {
      // Simulate "popular" stops or nearby
      const popularStops = [
        { id: 'place-sstat', attributes: { name: 'South Station', description: 'Red Line, Silver Line, Commuter Rail' } },
        { id: 'place-north', attributes: { name: 'North Station', description: 'Orange Line, Green Line, Commuter Rail' } },
        { id: 'place-pktrm', attributes: { name: 'Park Street', description: 'Red Line, Green Line' } },
        { id: 'place-harsq', attributes: { name: 'Harvard', description: 'Red Line' } },
        { id: 'place-coecl', attributes: { name: 'Copley', description: 'Green Line' } },
      ];
      setStops(popularStops);
    }
  }, [visible, searchTerm]);

  // Search logic
  useEffect(() => {
    const search = async () => {
      if (!searchTerm || searchTerm.length < 3) return;
      setLoading(true);
      const result = await mbtaService.searchStops(searchTerm);
      if (result.success) {
        setStops(result.data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="destination-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div 
            className="overlay-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="overlay-header">
              <div className="search-input-container">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Where to?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus={visible}
                />
              </div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            <div className="stops-list">
              {loading ? (
                <div style={{color: '#94a3b8', textAlign: 'center', padding: '20px'}}>Searching...</div>
              ) : (
                stops.map((stop, index) => (
                  <motion.div 
                    key={stop.id} 
                    className="stop-item" 
                    onClick={() => onSelect(stop)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(14, 165, 233, 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="stop-icon">🚉</div>
                    <div className="stop-info">
                      <div className="stop-name">{stop.attributes.name}</div>
                      <div className="stop-routes">
                        {/* Mock route pills based on description or id logic */}
                        {stop.attributes.description?.includes('Red') && <div className="route-pill" style={{background: ROUTE_LINE_colors.Red}} />}
                        {stop.attributes.description?.includes('Orange') && <div className="route-pill" style={{background: ROUTE_LINE_colors.Orange}} />}
                        {stop.attributes.description?.includes('Blue') && <div className="route-pill" style={{background: ROUTE_LINE_colors.Blue}} />}
                        {stop.attributes.description?.includes('Green') && <div className="route-pill" style={{background: ROUTE_LINE_colors['Green-B']}} />}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Contextual Map Alerts (Frame 6)
 */
function MapAlerts({ alerts }) {
  return (
    <div className="map-alerts-container">
      <AnimatePresence>
        {alerts && alerts.map((alert) => (
          <motion.div 
            key={alert.id} 
            className="map-alert"
            variants={alertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
          >
            {alert.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Game States
const GAME_STATES = {
  EXPLORATION: 'EXPLORATION',
  MISSION_PREVIEW: 'MISSION_PREVIEW',
  MISSION_LOCKED: 'MISSION_LOCKED',
  LIVE_PLAY: 'LIVE_PLAY',
  OUTCOME: 'OUTCOME'
};

/**
 * Main Game Screen Component
 */
function GameScreen({ gameMode = false }) {
  // GPS Tracking
  const { position, status: gpsStatus } = useGPSTracking();
  
  // MBTA Polling
  const { vehicles, status: mbtaStatus } = useMBTAPolling({
    routeIds: ['Red', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E', 'Blue'],
    interval: 8000,
    enabled: true
  });
  
  // Walking Provider
  const [walkingManager] = useState(() => new WalkingProviderManager());
  const [walkSource, setWalkSource] = useState('INITIALIZING');
  
  // Game State
  const [gameState, setGameState] = useState(GAME_STATES.EXPLORATION);
  const [destination, setDestination] = useState(null);
  const [quests, setQuests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [confidence, setConfidence] = useState('unknown'); // Fix: Re-add confidence state

  // Map Data State
  const [routeShapes, setRouteShapes] = useState([]);
  const [stops, setStops] = useState([]);

  // Load Map Data (Routes & Stops)
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // 1. Fetch Stops
        const stopsData = await MBTA_API.getStops({ location_type: 1 }, 'route');
        if (stopsData.data) {
          setStops(stopsData.data);
        }

        // 2. Fetch Route Shapes for primary subway lines
        const targetRoutes = ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];
        const shapesMap = [];

        await Promise.all(targetRoutes.map(async (routeId) => {
          const shapeRes = await MBTA_API.getShapes(routeId);
          if (shapeRes.data && shapeRes.data.length > 0) {
             // Take the first shape for simplicity (usually the canonical one)
             const shape = shapeRes.data[0];
             const positions = decodePolyline(shape.attributes.polyline);
             shapesMap.push({
                id: routeId,
                positions: positions,
                color: ROUTE_COLORS[routeId] || '#333'
             });
          }
        }));
        setRouteShapes(shapesMap);
      } catch (err) {
        console.error("Failed to load game map data:", err);
      }
    };
    loadMapData();
  }, []);
  
  // UI Triggers
  const [showDestOverlay, setShowDestOverlay] = useState(false);
  const [showXp_Overlay, setShowXp_Overlay] = useState(false);
  const [lastXp, setLastXp] = useState(0);
  
  // Default center (Boston)
  const defaultCenter = [42.3601, -71.0589];
  const mapCenter = position ? [position.lat, position.lng] : defaultCenter;
  
  // Update walk source periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setWalkSource(walkingManager.getCurrentSource());
    }, 5000);
    return () => clearInterval(interval);
  }, [walkingManager]);

  // Handle Destination Select -> Transition to PREVIEW
  const handleDestinationSelect = (stop) => {
    setDestination(stop.attributes.name);
    setShowDestOverlay(false);
    setGameState(GAME_STATES.MISSION_PREVIEW);
  };
  
  // Handle Mission Start -> Transition to LOCKED then LIVE
  const handleStartMission = () => {
    setGameState(GAME_STATES.MISSION_LOCKED);
    
    // Simulate Lock Animation delay
    setTimeout(() => {
      setGameState(GAME_STATES.LIVE_PLAY);
      
      // Generate Quest
      setQuests([
        { type: 'walk', title: `Walk to ${destination}`, subtext: 'Finding best route...', status: 'active' },
        { type: 'board', title: 'Board Train', subtext: 'Wait for updates', status: 'pending' }
      ]);
      
      // Show Alert
      setAlerts([{ id: Date.now(), message: 'MISSION STARTED' }]);
      setTimeout(() => setAlerts([]), 3000);
    }, 2000);
  };
  
  // XP Trigger
  const triggerXP = (amount) => {
    setLastXp(amount);
    setShowXp_Overlay(true);
    setTimeout(() => setShowXp_Overlay(false), 3000);
  };
  
  const handleAction = () => {
    if (gameState === GAME_STATES.EXPLORATION) {
      setShowDestOverlay(true);
    } else if (gameState === GAME_STATES.MISSION_PREVIEW) {
      handleStartMission();
    }
  };
  
  const isLocked = gameState === GAME_STATES.MISSION_LOCKED;
  const isLive = gameState === GAME_STATES.LIVE_PLAY;
  
  return (
    <div className={`game-screen state-${gameState.toLowerCase()}`}>
      <MissionHeader 
        gameState={gameState}
        destination={destination}
        onDestClick={() => setShowDestOverlay(true)}
        gpsStatus={gpsStatus}
      />
      
      <XPOverlay xpGained={lastXp} visible={showXp_Overlay} />
      
      <MapAlerts alerts={alerts} />

      <DestinationOverlay 
        visible={showDestOverlay} 
        onClose={() => setShowDestOverlay(false)}
        onSelect={handleDestinationSelect}
      />
      
      <div className={`map-canvas ${isLocked || isLive ? 'map-dimmed' : ''}`}>
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url={isLocked || isLive 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark mode for focus
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            }
            className="game-map-tiles"
          />
          
          <LocationMarker position={position} />

          {/* Render Route Lines */}
          <Pane name="routes-pane" style={{ zIndex: 450 }}>
            {routeShapes.map((shape) => (
              <Polyline
                key={shape.id}
                positions={shape.positions}
                pathOptions={{
                  color: shape.color,
                  weight: 4,
                  opacity: isLocked ? 0.3 : 0.6, // Dim when locked in mission
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            ))}
          </Pane>

          {/* Render Stations */}
          <Pane name="stations-pane" style={{ zIndex: 460 }}>
            {stops.map((stop) => (
              <Circle
                key={stop.id}
                center={[stop.attributes.latitude, stop.attributes.longitude]}
                radius={8}
                pathOptions={{
                  color: 'white',
                  weight: 1,
                  fillColor: '#334155', // Slate-700
                  fillOpacity: 1
                }}
                eventHandlers={{
                  click: () => {
                    if (gameState === GAME_STATES.EXPLORATION) {
                       handleDestinationSelect(stop); // Allow clicking map to set destination
                    }
                  }
                }}
              />
            ))}
          </Pane>
          
          {/* Player Avatar */}
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              icon={createPlayerIcon()}
              zIndexOffset={1000}
            />
          )}

          {/* Train Markers - Enhanced Visuals */}
          <Pane name="trains-pane" style={{ zIndex: 500 }}>
             {vehicles.map((vehicle) => {
               if (!vehicle.latitude || !vehicle.longitude) return null;
               const color = ROUTE_COLORS[vehicle.routeId] || '#ffffff';
               
               // Dynamic pulse for live tracking feel
               return (
                  <Circle
                    key={vehicle.id}
                    center={[vehicle.latitude, vehicle.longitude]}
                    radius={isLive ? 60 : 40} // Larger when live
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: 2,
                      className: 'live-train-marker' // Use CSS animation if possible
                    }}
                  >
                  </Circle>
               )
             })}
          </Pane>
        </MapContainer>
      </div>
      
      <BottomGameCard
        gameState={gameState}
        destination={destination}
        confidence={confidence}
        quests={quests}
        onAction={handleAction}
        dailyTasks={DAILY_TASKS}
      />
    </div>
  );
}

export default GameScreen;
