import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MBTA_API from '../config/mbtaApi';
import './RouteMap.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createStartIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: #4CAF50; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px;">🚉</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createEndIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: #F44336; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px;">🎯</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createTransferIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: #FF9800; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">🔄</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Component to fit bounds when route changes
function FitBounds({ positions }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  
  return null;
}

/**
 * RouteMap Component
 * Shows the transit route on a map with origin, destination, and optional transfer points
 */
function RouteMap({ originStop, transferStop, destinationStop, originRoute, destinationRoute }) {
  const [routeShapes, setRouteShapes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch route shapes from MBTA API
  useEffect(() => {
    const fetchRouteShapes = async () => {
      if (!originRoute && !destinationRoute) {
        console.log('No routes selected yet');
        return;
      }
      
      console.log('=== Starting Route Fetch ===');
      console.log('Origin Route:', originRoute?.attributes?.long_name, originRoute?.id);
      console.log('Origin Stop:', originStop?.attributes?.name);
      console.log('Destination Route:', destinationRoute?.attributes?.long_name, destinationRoute?.id);
      console.log('Destination Stop:', destinationStop?.attributes?.name);
      
      setLoading(true);
      const shapes = [];
      
      try {
        // Fetch shape for origin route
        if (originRoute) {
          console.log('📍 Fetching shapes for route:', originRoute.id);
          const shapeData = await MBTA_API.getShapes(originRoute.id);
          console.log('✅ Shape data received:', shapeData);
          
          if (shapeData.data && shapeData.data.length > 0) {
            // Get the shape polyline
            const shape = shapeData.data[0];
            console.log('Shape attributes:', shape.attributes);
            
            if (shape.attributes.polyline) {
              const decoded = decodePolyline(shape.attributes.polyline);
              shapes.push({
                positions: decoded,
                color: `#${originRoute.attributes.color || '4CAF50'}`,
                route: originRoute.attributes.long_name
              });
              console.log('✅ Added origin route shape with', decoded.length, 'points');
            } else {
              console.warn('⚠️ No polyline in shape data');
            }
          } else {
            console.warn('⚠️ No shape data returned from API');
          }
          
          // If we have stops but no shape data, draw simple line
          if (originStop && destinationStop && shapes.length === 0) {
            console.log('📏 Using fallback line between stops');
            const endStop = transferStop || destinationStop;
            shapes.push({
              positions: [
                [originStop.attributes.latitude, originStop.attributes.longitude],
                [endStop.attributes.latitude, endStop.attributes.longitude]
              ],
              color: `#${originRoute.attributes.color || '4CAF50'}`,
              route: originRoute.attributes.long_name
            });
          }
        }
        
        // Fetch shape for destination route if different
        if (destinationRoute && destinationRoute.id !== originRoute?.id) {
          console.log('📍 Fetching shapes for destination route:', destinationRoute.id);
          const shapeData = await MBTA_API.getShapes(destinationRoute.id);
          console.log('✅ Destination shape data received:', shapeData);
          
          if (shapeData.data && shapeData.data.length > 0) {
            const shape = shapeData.data[0];
            if (shape.attributes.polyline) {
              const decoded = decodePolyline(shape.attributes.polyline);
              shapes.push({
                positions: decoded,
                color: `#${destinationRoute.attributes.color || 'F44336'}`,
                route: destinationRoute.attributes.long_name
              });
              console.log('✅ Added destination route shape with', decoded.length, 'points');
            }
          }
          
          // Fallback line for destination route
          if (transferStop && destinationStop && shapes.length === 1) {
            console.log('📏 Using fallback line for destination route');
            shapes.push({
              positions: [
                [transferStop.attributes.latitude, transferStop.attributes.longitude],
                [destinationStop.attributes.latitude, destinationStop.attributes.longitude]
              ],
              color: `#${destinationRoute.attributes.color || 'F44336'}`,
              route: destinationRoute.attributes.long_name
            });
          }
        }
        
        console.log('🎯 Final shapes array:', shapes.length, 'shapes');
        console.log('Shapes details:', shapes);
        setRouteShapes(shapes);
      } catch (error) {
        console.error('❌ Error fetching route shapes:', error);
        // Fallback: draw simple lines between stops
        const fallbackShapes = [];
        if (originStop && destinationStop) {
          const waypoints = [originStop];
          if (transferStop) waypoints.push(transferStop);
          waypoints.push(destinationStop);
          
          console.log('🔧 Using emergency fallback with', waypoints.length, 'waypoints');
          for (let i = 0; i < waypoints.length - 1; i++) {
            fallbackShapes.push({
              positions: [
                [waypoints[i].attributes.latitude, waypoints[i].attributes.longitude],
                [waypoints[i + 1].attributes.latitude, waypoints[i + 1].attributes.longitude]
              ],
              color: '#2196F3',
              route: 'Direct Route'
            });
          }
        }
        setRouteShapes(fallbackShapes);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRouteShapes();
  }, [originRoute, destinationRoute, originStop, destinationStop, transferStop]);

  // Default center (Boston)
  const defaultCenter = [42.3601, -71.0589];
  
  // Calculate center from stops
  const mapCenter = originStop 
    ? [originStop.attributes.latitude, originStop.attributes.longitude]
    : defaultCenter;

  // Collect all positions for bounds
  const allPositions = [];
  if (originStop) {
    allPositions.push([originStop.attributes.latitude, originStop.attributes.longitude]);
  }
  if (transferStop) {
    allPositions.push([transferStop.attributes.latitude, transferStop.attributes.longitude]);
  }
  if (destinationStop) {
    allPositions.push([destinationStop.attributes.latitude, destinationStop.attributes.longitude]);
  }

  if (!originStop && !destinationStop) {
    return (
      <div className="route-map-container">
        <div className="route-map-placeholder">
          <p>📍 Select origin and destination to view route</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-map-container">
      {loading && (
        <div className="route-map-loading">
          <div className="loading-spinner"></div>
          <p>Loading route...</p>
        </div>
      )}
      
      {/* Debug Info */}
      {routeShapes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <strong>🗺️ {routeShapes.length} route(s) loaded</strong>
          {routeShapes.map((shape, i) => (
            <div key={i}>
              • {shape.route}: {shape.positions.length} points
            </div>
          ))}
        </div>
      )}
      
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds positions={allPositions} />
        
        {/* Route Lines */}
        {routeShapes.length > 0 && console.log('🎨 Rendering', routeShapes.length, 'polylines')}
        {routeShapes.map((shape, index) => {
          console.log(`Polyline ${index}:`, shape.positions.length, 'points, color:', shape.color);
          return (
            <Polyline
              key={`route-${index}`}
              positions={shape.positions}
              pathOptions={{
                color: shape.color,
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            >
              <Popup>
                <strong>{shape.route}</strong>
                <div>{shape.positions.length} points</div>
              </Popup>
            </Polyline>
          );
        })}
        
        {/* Origin Marker */}
        {originStop && (
          <Marker
            position={[originStop.attributes.latitude, originStop.attributes.longitude]}
            icon={createStartIcon()}
          >
            <Popup>
              <div className="stop-popup">
                <strong>🚉 Origin</strong>
                <div>{originStop.attributes.name}</div>
                {originRoute && (
                  <div style={{ marginTop: '5px', color: `#${originRoute.attributes.color}`, fontWeight: 'bold' }}>
                    {originRoute.attributes.long_name}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Transfer Marker */}
        {transferStop && (
          <Marker
            position={[transferStop.attributes.latitude, transferStop.attributes.longitude]}
            icon={createTransferIcon()}
          >
            <Popup>
              <div className="stop-popup">
                <strong>🔄 Transfer</strong>
                <div>{transferStop.attributes.name}</div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Destination Marker */}
        {destinationStop && (
          <Marker
            position={[destinationStop.attributes.latitude, destinationStop.attributes.longitude]}
            icon={createEndIcon()}
          >
            <Popup>
              <div className="stop-popup">
                <strong>🎯 Destination</strong>
                <div>{destinationStop.attributes.name}</div>
                {destinationRoute && (
                  <div style={{ marginTop: '5px', color: `#${destinationRoute.attributes.color}`, fontWeight: 'bold' }}>
                    {destinationRoute.attributes.long_name}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

// Decode Google polyline format
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export default RouteMap;
