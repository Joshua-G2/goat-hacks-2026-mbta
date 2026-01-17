import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';
import MBTA_API from '../config/mbtaApi';

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
      map.flyTo(position, 13);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <Circle
      center={position}
      radius={50}
      pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.4 }}
    >
      <Popup>You are here</Popup>
    </Circle>
  );
}

/**
 * InteractiveMap Component with Live GPS and MBTA Routes
 */
function InteractiveMap({ selectedStops }) {
  const [userLocation, setUserLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [routeShapes, setRouteShapes] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Boston default center
  const defaultCenter = [42.3601, -71.0589];

  // Get user's live GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Location access denied, using default Boston center');
          setUserLocation(defaultCenter);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setUserLocation(defaultCenter);
    }
  }, []);

  // Load MBTA routes and stops
  useEffect(() => {
    const loadMBTAData = async () => {
      try {
        setLoading(true);
        
        // Fetch subway routes
        const routesData = await MBTA_API.getRoutes({ type: '0,1' });
        setRoutes(routesData.data || []);

        // Fetch all subway stops
        const stopsData = await MBTA_API.getStops({ 
          location_type: 1,
          route_type: '0,1' 
        });
        setStops(stopsData.data || []);

        setLoading(false);
      } catch (error) {
        console.error('Error loading MBTA data:', error);
        setLoading(false);
      }
    };

    loadMBTAData();
  }, []);

  // Load route shapes when routes change
  useEffect(() => {
    const loadRouteShapes = async () => {
      const shapes = {};
      
      for (const route of routes.slice(0, 5)) { // Load first 5 routes to avoid rate limits
        try {
          const shapeData = await MBTA_API.getShapes(route.id);
          if (shapeData.data && shapeData.data.length > 0) {
            const coordinates = shapeData.data[0].attributes.polyline
              ? decodePolyline(shapeData.data[0].attributes.polyline)
              : [];
            shapes[route.id] = {
              coordinates,
              color: `#${route.attributes.color}` || '#000000'
            };
          }
        } catch (error) {
          console.error(`Error loading shape for route ${route.id}:`, error);
        }
      }
      
      setRouteShapes(shapes);
    };

    if (routes.length > 0) {
      loadRouteShapes();
    }
  }, [routes]);

  // Load live vehicle positions every 10 seconds
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vehicleData = await MBTA_API.getVehicles(null);
        if (vehicleData.data) {
          setVehicles(vehicleData.data);
        }
      } catch (error) {
        console.error('Error loading vehicles:', error);
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Decode Google polyline format
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

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  // Create custom icons for different stop types
  const createStopIcon = (isSelected, type) => {
    const colors = {
      origin: '#4CAF50',
      transfer: '#FFC107',
      destination: '#F44336',
      default: '#2196F3'
    };
    
    const color = colors[type] || colors.default;
    const size = isSelected ? 16 : 10;

    return L.divIcon({
      className: 'custom-stop-marker',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  // Create vehicle icon
  const createVehicleIcon = (color) => {
    return L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="background-color: #${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  if (loading || !userLocation) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Loading live map and MBTA data...</p>
      </div>
    );
  }

  return (
    <div className="interactive-map-container">
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User's live location */}
        <LocationMarker position={userLocation} />

        {/* MBTA Route Lines */}
        {Object.entries(routeShapes).map(([routeId, shape]) => (
          <Polyline
            key={routeId}
            positions={shape.coordinates}
            pathOptions={{ color: shape.color, weight: 4, opacity: 0.7 }}
          />
        ))}

        {/* MBTA Stops */}
        {stops.map((stop) => {
          if (!stop.attributes.latitude || !stop.attributes.longitude) return null;

          const position = [stop.attributes.latitude, stop.attributes.longitude];
          let stopType = 'default';
          
          if (selectedStops?.origin?.id === stop.id) stopType = 'origin';
          else if (selectedStops?.transfer?.id === stop.id) stopType = 'transfer';
          else if (selectedStops?.destination?.id === stop.id) stopType = 'destination';

          const isSelected = stopType !== 'default';

          return (
            <Marker
              key={stop.id}
              position={position}
              icon={createStopIcon(isSelected, stopType)}
            >
              <Popup>
                <div className="stop-popup">
                  <strong>{stop.attributes.name}</strong>
                  {isSelected && (
                    <div className="stop-type-badge">{stopType.toUpperCase()}</div>
                  )}
                  {stop.attributes.wheelchair_boarding === 1 && (
                    <div>♿ Accessible</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live Vehicle Positions */}
        {vehicles.map((vehicle) => {
          if (!vehicle.attributes.latitude || !vehicle.attributes.longitude) return null;

          const position = [vehicle.attributes.latitude, vehicle.attributes.longitude];
          const routeColor = vehicle.relationships?.route?.data?.id 
            ? routes.find(r => r.id === vehicle.relationships.route.data.id)?.attributes.color 
            : '000000';

          return (
            <Marker
              key={vehicle.id}
              position={position}
              icon={createVehicleIcon(routeColor || '000000')}
            >
              <Popup>
                <div className="vehicle-popup">
                  <strong>🚇 Live Vehicle</strong>
                  <div>Status: {vehicle.attributes.current_status || 'In transit'}</div>
                  {vehicle.attributes.speed && (
                    <div>Speed: {Math.round(vehicle.attributes.speed * 2.237)} mph</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        <h4>🗺️ Live Map</h4>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'blue' }}></div>
          <span>Your Location (GPS)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#4CAF50' }}></div>
          <span>Origin</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#FFC107' }}></div>
          <span>Transfer</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#F44336' }}></div>
          <span>Destination</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot vehicle-dot"></div>
          <span>Live Vehicles</span>
        </div>
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>Live Updates</span>
        </div>
      </div>
    </div>
  );
}

export default InteractiveMap;
