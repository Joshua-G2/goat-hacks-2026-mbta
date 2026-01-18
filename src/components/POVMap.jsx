import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './POVMap.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

console.log('POVMap loaded, Mapbox token:', MAPBOX_TOKEN ? 'Present' : 'Missing');

function POVMap({ 
  tasks, 
  userPosition,
  otherUsers,
  events,
  onTaskClick,
  onEventClick
}) {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: userPosition?.[1] || -71.0589,
    latitude: userPosition?.[0] || 42.3601,
    zoom: 17,
    pitch: 70,
    bearing: 0
  });
  const [deviceOrientation, setDeviceOrientation] = useState(null);
  const markersRef = useRef([]);

  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          startOrientationTracking();
        }
      } catch {
        console.log('Orientation permission denied');
      }
    } else {
      startOrientationTracking();
    }
  };

  const startOrientationTracking = () => {
    window.addEventListener('deviceorientation', handleOrientation);
  };

  const handleOrientation = (event) => {
    if (event.alpha !== null) {
      const heading = 360 - event.alpha;
      setDeviceOrientation(heading);
      setViewState(prev => ({
        ...prev,
        bearing: heading
      }));
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      POLICE: '🚓',
      DELAY: '⚠️',
      CROWDED: '👥',
      MAINTENANCE: '🔧',
      INCIDENT: '⚡'
    };
    return icons[type] || '📍';
  };

  const addTaskMarkers = useCallback((map) => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add user position marker (character)
    if (userPosition && userPosition[0] && userPosition[1]) {
      const userEl = document.createElement('div');
      userEl.className = 'user-marker-3d';
      userEl.innerHTML = `
        <div class="user-pulse"></div>
        <div class="user-avatar">👤</div>
        <div class="user-label">You</div>
      `;

      const userMarker = new mapboxgl.Marker(userEl)
        .setLngLat([userPosition[1], userPosition[0]])
        .addTo(map);

      markersRef.current.push(userMarker);
    }

    tasks?.forEach(task => {
      if (!task.location) return;

      const el = document.createElement('div');
      el.className = 'task-marker-3d';
      el.innerHTML = `
        <div class="task-pulse"></div>
        <div class="task-icon">🎯</div>
        <div class="task-label">${task.title || 'Quest'}</div>
      `;
      el.addEventListener('click', () => {
        if (onTaskClick) onTaskClick(task.id);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([task.location.longitude, task.location.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    events?.forEach(event => {
      if (!event.location) return;

      const el = document.createElement('div');
      el.className = 'event-marker-3d';
      el.innerHTML = `<div class="event-icon">${getEventIcon(event.type)}</div>`;
      el.addEventListener('click', () => {
        if (onEventClick) onEventClick(event.id);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.location.longitude, event.location.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    otherUsers?.forEach(user => {
      if (!user.location) return;

      const el = document.createElement('div');
      el.className = 'player-marker-3d';
      el.innerHTML = `
        <div class="player-avatar">👤</div>
        <div class="player-name">${user.name || 'Player'}</div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([user.location.longitude, user.location.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [tasks, events, otherUsers, userPosition, onTaskClick, onEventClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    map.on('load', () => {
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      if (!map.getLayer('3d-buildings')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      }

      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      addTaskMarkers(map);
    });

    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [addTaskMarkers]);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map.loaded()) {
        addTaskMarkers(map);
      }
    }
  }, [addTaskMarkers]);

  useEffect(() => {
    if (userPosition) {
      setViewState(prev => ({
        ...prev,
        longitude: userPosition[1],
        latitude: userPosition[0]
      }));
    }
  }, [userPosition]);

  const toggle3DView = () => {
    setViewState(prev => ({
      ...prev,
      pitch: prev.pitch > 0 ? 0 : 70
    }));
  };

  const recenterCamera = () => {
    if (userPosition) {
      setViewState(prev => ({
        ...prev,
        longitude: userPosition[1],
        latitude: userPosition[0],
        zoom: 17
      }));
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="pov-map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: 'white' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>⚠️ Mapbox Token Missing</h2>
          <p>Please add your Mapbox token to the .env file</p>
          <code style={{ background: '#333', padding: '0.5rem', borderRadius: '4px', display: 'block', marginTop: '1rem' }}>
            VITE_MAPBOX_TOKEN=your_token_here
          </code>
        </div>
      </div>
    );
  }

  // No mapbox token error
  if (!MAPBOX_TOKEN) {
    return (
      <div className="pov-map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '20px', textAlign: 'center' }}>
        <div>
          <h3>⚠️ Mapbox Token Missing</h3>
          <p>Please configure VITE_MAPBOX_TOKEN in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pov-map-container">
      {!mapLoaded && !mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          color: 'white',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          <div>🗺️ Loading map...</div>
        </div>
      )}
      
      {mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          color: 'white',
          fontSize: '16px',
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(255, 0, 0, 0.8)',
          borderRadius: '10px'
        }}>
          <div>❌ Map Error</div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>{mapError}</div>
        </div>
      )}
      
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => {
          console.log('✅ Map loaded successfully');
          setMapLoaded(true);
        }}
        onError={(err) => {
          console.error('❌ Map error:', err);
          setMapError(err.error?.message || 'Failed to load map');
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      />

      <div className="map-controls">
        <button 
          className="control-btn"
          onClick={toggle3DView}
          title={viewState.pitch > 0 ? "2D View" : "3D View"}
        >
          {viewState.pitch > 0 ? '🗺️' : '🏙️'}
        </button>
        <button 
          className="control-btn"
          onClick={recenterCamera}
          title="Recenter on me"
        >
          📍
        </button>
        <button 
          className="control-btn"
          onClick={requestOrientationPermission}
          title="Enable Compass"
        >
          🧭
        </button>
      </div>

      <div className="map-hud">
        <div className="hud-stats">
          <div className="hud-item">
            <span className="hud-label">Nearby Quests</span>
            <span className="hud-value">{tasks?.length || 0}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Events</span>
            <span className="hud-value">{events?.length || 0}</span>
          </div>
        </div>
      </div>

      {deviceOrientation !== null && (
        <div className="compass-indicator">
          <div className="compass-rose" style={{ transform: `rotate(${-deviceOrientation}deg)` }}>
            <div className="compass-n">N</div>
            <div className="compass-direction">{Math.round(deviceOrientation)}°</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POVMap;
