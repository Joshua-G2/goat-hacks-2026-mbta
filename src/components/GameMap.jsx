import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  EVENT_TYPES,
  filterActiveEvents 
} from '../utils/gameHelpers';
import './GameMap.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to center map on user location
function LocationMarker({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <Circle
      center={position}
      radius={30}
      pathOptions={{ color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.6 }}
    >
      <Popup>
        <strong>🎮 You</strong>
        <div>Your current position</div>
      </Popup>
    </Circle>
  );
}

/**
 * GameMap Component
 * 
 * RPG-style map with tasks, user positions, and event markers
 */
function GameMap({ 
  tasks, 
  xp, 
  miles, 
  onCompleteTask, 
  onTravel, 
  userPosition, 
  otherUsers,
  events,
  onReportEvent
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);

  // Boston default center - memoized to prevent dependency changes
  const defaultCenter = useMemo(() => [42.3601, -71.0589], []);

  // Get user's live GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = [position.coords.latitude, position.coords.longitude];
          setUserLocation(newPos);
          if (onTravel) {
            // Calculate distance traveled and award miles
            // This would use the previous position to calculate distance
            console.log('Position updated:', newPos);
          }
        },
        () => {
          console.log('Location access denied, using default Boston center');
          setUserLocation(userPosition || defaultCenter);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [userPosition, onTravel, defaultCenter]);

  // Filter out expired events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEvents(filterActiveEvents(events || []));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [events]);

  const handleTaskClick = (taskId) => {
    if (onCompleteTask) {
      onCompleteTask(taskId);
    }
  };

  const handleReportEvent = (eventType) => {
    if (onReportEvent && userLocation) {
      onReportEvent(eventType, userLocation);
      setShowEventMenu(false);
    }
  };

  // Create custom icons for game elements
  const createTaskIcon = () => {
    return L.divIcon({
      className: 'task-marker',
      html: `<div style="background: linear-gradient(135deg, #FFD700, #FFA500); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 16px;">🎯</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const createPlayerIcon = () => {
    return L.divIcon({
      className: 'player-marker',
      html: `<div style="background: #2196F3; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👤</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  };

  const createEventIcon = (eventType) => {
    const config = EVENT_TYPES[eventType] || EVENT_TYPES.INCIDENT;
    const colors = {
      POLICE: '#F44336',
      DELAY: '#FFC107',
      CROWDED: '#FF9800',
      MAINTENANCE: '#9E9E9E',
      INCIDENT: '#E91E63'
    };
    
    return L.divIcon({
      className: 'event-marker',
      html: `<div style="background: ${colors[eventType] || '#E91E63'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px;">${config.icon}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  if (!userLocation) {
    return (
      <div className="game-map-container">
        <div className="game-map-loading">
          <div className="loading-spinner"></div>
          <p>Loading game map with GPS...</p>
          <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
            Make sure location access is enabled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-map-container">
      {/* Real Leaflet Map with Game Overlays */}
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User's live location with pulsing effect */}
        <LocationMarker position={userLocation} />

        {/* Task Markers (AR-style objectives) */}
        {tasks && tasks.map((task) => {
          if (!task.location) return null;
          return (
            <Marker
              key={task.id}
              position={task.location}
              icon={createTaskIcon()}
              eventHandlers={{
                click: () => handleTaskClick(task.id)
              }}
            >
              <Popup>
                <div className="task-popup">
                  <strong>🎯 {task.title}</strong>
                  <div>{task.description}</div>
                  <div style={{ marginTop: '8px', color: '#FFD700', fontWeight: 'bold' }}>
                    +{task.xpReward} XP
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Other Players (Multiplayer) */}
        {otherUsers && otherUsers.map((user) => {
          if (!user.position) return null;
          return (
            <Marker
              key={user.id}
              position={user.position}
              icon={createPlayerIcon()}
            >
              <Popup>
                <div className="player-popup">
                  <strong>👤 {user.username || 'Player'}</strong>
                  <div>Level {user.level || 1}</div>
                  <div>{user.xp || 0} XP</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Event Reports (Crowdsourced like Waze) */}
        {activeEvents && activeEvents.map((event) => {
          if (!event.location) return null;
          return (
            <Marker
              key={event.id}
              position={event.location}
              icon={createEventIcon(event.type)}
            >
              <Popup>
                <div className="event-popup">
                  <strong>{EVENT_TYPES[event.type]?.icon} {EVENT_TYPES[event.type]?.type}</strong>
                  <div>{event.description || 'Reported by user'}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    {event.timestamp ? `Reported ${Math.floor((new Date().getTime() - event.timestamp) / 60000)} min ago` : 'Recently reported'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* HUD Overlay */}
      <div className="game-hud">
        <div className="hud-stats">
          <div className="stat-item">
            <span className="stat-icon">⭐</span>
            <span className="stat-label">XP:</span>
            <span className="stat-value">{xp || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🚇</span>
            <span className="stat-label">Miles:</span>
            <span className="stat-value">{(miles || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Event Reporting Menu */}
      <div className="event-controls">
        <button 
          className="report-button"
          onClick={() => setShowEventMenu(!showEventMenu)}
        >
          📢 Report Event
        </button>

        {showEventMenu && (
          <div className="event-menu">
            {Object.entries(EVENT_TYPES).map(([key, config]) => (
              <button
                key={key}
                className="event-option"
                onClick={() => handleReportEvent(key)}
              >
                <span className="event-icon">{config.icon}</span>
                {config.type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tasks List */}
      {tasks && tasks.length > 0 && (
        <div className="tasks-panel">
          <h4>🎯 Active Tasks</h4>
          <div className="tasks-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>
                  <div className="task-reward">+{task.xpReward} XP</div>
                </div>
                <button
                  className="complete-task-button"
                  onClick={() => handleTaskClick(task.id)}
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      {activeEvents && activeEvents.length > 0 && (
        <div className="events-panel">
          <h4>⚠️ Recent Events</h4>
          <div className="events-list">
            {activeEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="event-item">
                <span className="event-icon">{event.icon}</span>
                <span className="event-type">{event.type}</span>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Players List */}
      {otherUsers && otherUsers.length > 0 && (
        <div className="players-panel">
          <h4>👥 Nearby Players</h4>
          <div className="players-list">
            {otherUsers.slice(0, 5).map((user) => (
              <div key={user.userId} className="player-item">
                <span className="player-icon">🚶</span>
                <span className="player-name">{user.name || 'Fellow Traveler'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GameMap;
