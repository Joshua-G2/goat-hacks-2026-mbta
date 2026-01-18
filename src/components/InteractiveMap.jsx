import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Pane, useMap, useMapEvents } from 'react-leaflet';
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
      map.flyTo(position, 15);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <CircleMarker
      center={position}
      radius={9}
      pane="userLocation"
      className="user-location-marker"
      pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#061a3a', fillOpacity: 0.95 }}
    >
      <Popup>
        <strong>🎮 You</strong>
        <div>Your current position</div>
      </Popup>
    </CircleMarker>
  );
}

function FitBounds({ origin, destination }) {
  const map = useMap();

  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
    }
  }, [origin, destination, map]);

  return null;
}

function DebugMouseTracker({ enabled, onMove, onLeave }) {
  useMapEvents({
    mousemove: (event) => {
      if (enabled) {
        onMove(event.latlng, event.originalEvent);
      }
    },
    mouseout: () => {
      onLeave();
    }
  });

  return null;
}

/**
 * InteractiveMap Component with Live GPS and MBTA Routes
 */
function InteractiveMap({
  selectedStops,
  onDataUpdated = () => {},
  legendVisibility: controlledLegendVisibility,
  onLegendVisibilityChange,
  showLegend = true,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [stopMarkers, setStopMarkers] = useState([]);
  const [routeShapes, setRouteShapes] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [mouseScreenPos, setMouseScreenPos] = useState(null);
  const [selectedRouteShape, setSelectedRouteShape] = useState(null);
  const [legendVisibility, setLegendVisibility] = useState({
    user: true,
    origin: true,
    transfer: true,
    destination: true,
    vehicles: true,
  });
  const activeLegendVisibility = controlledLegendVisibility || legendVisibility;
  const updateLegendVisibility = onLegendVisibilityChange || setLegendVisibility;

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

        // Fetch all stations (all routes) with route info for line colors
        const stopsData = await MBTA_API.getStops({ 
          location_type: 1
        }, 'route');
        setStops(stopsData.data || []);

        const routeColorById = new Map();
        if (stopsData.included) {
          stopsData.included
            .filter((item) => item.type === 'route')
            .forEach((route) => {
              if (route?.attributes?.color) {
                routeColorById.set(route.id, route.attributes.color);
              }
            });
        }

        const markers = (stopsData.data || []).map((stop) => {
          const routeId = stop.relationships?.routes?.data?.[0]?.id;
          return {
            ...stop,
            lineColor: routeColorById.get(routeId),
          };
        });

        setStopMarkers(markers);

        setLoading(false);
        onDataUpdated();
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
      onDataUpdated();
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
          onDataUpdated();
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
  const createVehicleIcon = () => {
    return L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="background-color: #111827; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  const getStopCoordinates = (stop) => {
    const latitude = stop?.attributes?.latitude ?? stop?.latitude;
    const longitude = stop?.attributes?.longitude ?? stop?.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return [latitude, longitude];
  };

  const getStopName = (stop) => stop?.attributes?.name || stop?.name || '';

  const originPosition = getStopCoordinates(selectedStops?.origin);
  const destinationPosition = getStopCoordinates(selectedStops?.destination);

  const getRouteIdsForStop = (stop) => {
    const routeData = stop?.relationships?.routes?.data;
    if (!routeData) return [];
    if (Array.isArray(routeData)) {
      return routeData.map((route) => route.id).filter(Boolean);
    }
    return routeData.id ? [routeData.id] : [];
  };

  const findCommonRouteId = () => {
    const originRoutes = getRouteIdsForStop(selectedStops?.origin);
    const destinationRoutes = getRouteIdsForStop(selectedStops?.destination);
    if (originRoutes.length === 0 || destinationRoutes.length === 0) {
      return originRoutes[0] || destinationRoutes[0] || null;
    }
    return originRoutes.find((routeId) => destinationRoutes.includes(routeId)) || originRoutes[0];
  };

  const getStopLineColor = (stopId) => {
    const matched = stopMarkers.find(stop => stop.id === stopId);
    return matched?.lineColor ? `#${matched.lineColor}` : '#2196F3';
  };

  const getRouteColor = (routeId) => {
    const matched = routes.find((route) => route.id === routeId);
    return matched?.attributes?.color ? `#${matched.attributes.color}` : '#1F2937';
  };

  const getSelectedStopColor = () => '#0b2d6b';
  const getUserLocationColor = () => '#061a3a';

  const getGreenLineLetter = (stop) => {
    const routeData = stop?.relationships?.routes?.data;
    if (!routeData) return null;
    const routeIds = Array.isArray(routeData) ? routeData.map((route) => route.id) : [routeData.id];
    const greenRoute = routeIds.find((routeId) => routeId?.startsWith('Green-'));
    if (!greenRoute) return null;
    return greenRoute.split('-')[1] || null;
  };

  const createGreenLineLabel = (letter, color) =>
    L.divIcon({
      className: 'green-line-label',
      html: `<div style="background-color: ${color};">${letter}</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

  useEffect(() => {
    const loadSelectedRouteShape = async () => {
      const routeId = findCommonRouteId();
      if (!routeId) {
        setSelectedRouteShape(null);
        return;
      }

      try {
        const shapeData = await MBTA_API.getShapes(routeId);
        const shape = shapeData?.data?.[0];
        if (!shape?.attributes?.polyline) {
          setSelectedRouteShape(null);
          return;
        }
        setSelectedRouteShape({
          routeId,
          coordinates: decodePolyline(shape.attributes.polyline),
          color: getRouteColor(routeId),
        });
        onDataUpdated();
      } catch (error) {
        console.error('Error loading selected route shape:', error);
        setSelectedRouteShape(null);
      }
    };

    if (selectedStops?.origin && selectedStops?.destination) {
      loadSelectedRouteShape();
    } else {
      setSelectedRouteShape(null);
    }
  }, [selectedStops?.origin, selectedStops?.destination, routes]);

  if (loading || !userLocation) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Loading live map and MBTA data...</p>
        <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
          Make sure location access is enabled
        </p>
      </div>
    );
  }

  return (
    <div className="interactive-map-container">
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        className="interactive-map"
      >
        <Pane name="selectedStops" style={{ zIndex: 650 }} />
        <Pane name="routeMotion" style={{ zIndex: 620 }} />
        <Pane name="userLocation" style={{ zIndex: 700 }} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User's live location */}
        {activeLegendVisibility.user && <LocationMarker position={userLocation} />}
        <FitBounds origin={originPosition} destination={destinationPosition} />
        <DebugMouseTracker
          enabled={debugEnabled}
          onMove={(latlng, event) => {
            setMouseLatLng(latlng);
            setMouseScreenPos({ x: event.clientX, y: event.clientY });
          }}
          onLeave={() => {
            setMouseLatLng(null);
            setMouseScreenPos(null);
          }}
        />

        {/* MBTA Route Lines */}
        {Object.entries(routeShapes).map(([routeId, shape]) => (
          <Polyline
            key={routeId}
            positions={shape.coordinates}
            pathOptions={{ color: shape.color, weight: 4, opacity: 0.7 }}
          />
        ))}

        {/* MBTA Stations */}
        {stopMarkers.map((stop) => {
          if (!stop.attributes.latitude || !stop.attributes.longitude) return null;

          const position = [stop.attributes.latitude, stop.attributes.longitude];
          let stopType = 'default';
          const isOrigin = selectedStops?.origin?.id === stop.id && activeLegendVisibility.origin;
          const isTransfer = selectedStops?.transfer?.id === stop.id && activeLegendVisibility.transfer;
          const isDestination = selectedStops?.destination?.id === stop.id && activeLegendVisibility.destination;

          if (isOrigin) stopType = 'origin';
          else if (isTransfer) stopType = 'transfer';
          else if (isDestination) stopType = 'destination';

          const isSelected = stopType !== 'default';
          const lineColor = stop.lineColor ? `#${stop.lineColor}` : '#2196F3';
          const greenLineLetter = getGreenLineLetter(stop);

          return (
            <React.Fragment key={stop.id}>
              <CircleMarker
                center={position}
                radius={isSelected ? 8 : 5}
                pathOptions={{
                  color: '#ffffff',
                  weight: isSelected ? 2.5 : 1.5,
                  fillColor: lineColor,
                  fillOpacity: 0.9,
                }}
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
              </CircleMarker>
              {greenLineLetter && (
                <Marker position={position} icon={createGreenLineLabel(greenLineLetter, lineColor)} />
              )}
            </React.Fragment>
          );
        })}

        {/* Selected route along the tracks */}
        {selectedRouteShape && selectedRouteShape.coordinates.length > 0 && (
          <Polyline
            positions={selectedRouteShape.coordinates}
            pane="routeMotion"
            className="route-motion-line"
            pathOptions={{
              color: selectedRouteShape.color,
              weight: 5,
              opacity: 0.95,
              dashArray: '6 10',
            }}
          />
        )}
        {originPosition && activeLegendVisibility.origin && (
          <CircleMarker
            center={originPosition}
            radius={11}
            pane="selectedStops"
            className="selected-stop-marker origin-marker"
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              fillColor: getSelectedStopColor(),
              fillOpacity: 0.98,
            }}
          >
            <Popup>
              <strong>Origin</strong>
              <div>{getStopName(selectedStops.origin)}</div>
            </Popup>
          </CircleMarker>
        )}
        {destinationPosition && activeLegendVisibility.destination && (
          <CircleMarker
            center={destinationPosition}
            radius={11}
            pane="selectedStops"
            className="selected-stop-marker destination-marker"
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              fillColor: getSelectedStopColor(),
              fillOpacity: 0.98,
            }}
          >
            <Popup>
              <strong>Destination</strong>
              <div>{getStopName(selectedStops.destination)}</div>
            </Popup>
          </CircleMarker>
        )}

        {/* Live Vehicle Positions */}
        {activeLegendVisibility.vehicles && vehicles.map((vehicle) => {
          if (!vehicle.attributes.latitude || !vehicle.attributes.longitude) return null;

          const position = [vehicle.attributes.latitude, vehicle.attributes.longitude];
          const routeColor = '111827';

          return (
            <Marker
              key={vehicle.id}
              position={position}
              icon={createVehicleIcon(routeColor)}
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
      {showLegend && (
        <LiveMapLegend
          legendVisibility={activeLegendVisibility}
          onLegendVisibilityChange={updateLegendVisibility}
        />
      )}

      <div className="map-debug-toggle">
        <label className="map-debug-label">
          <input
            type="checkbox"
            checked={debugEnabled}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setDebugEnabled(nextValue);
              if (!nextValue) {
                setMouseLatLng(null);
                setMouseScreenPos(null);
              }
            }}
          />
          Show Coordinates
        </label>
      </div>

      {debugEnabled && mouseLatLng && mouseScreenPos && (
        <div
          className="map-debug-coordinates"
          style={{
            left: mouseScreenPos.x + 12,
            top: mouseScreenPos.y + 12
          }}
        >
          <div>lat: {mouseLatLng.lat.toFixed(6)}</div>
          <div>lng: {mouseLatLng.lng.toFixed(6)}</div>
        </div>
      )}
    </div>
  );
}

export function LiveMapLegend({
  legendVisibility,
  onLegendVisibilityChange,
  className = '',
}) {
  return (
    <div className={`map-legend ${className}`.trim()}>
      <h4>🗺️ Live Map</h4>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.user}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, user: event.target.checked }))
          }
        />
        <div className="legend-dot" style={{ background: '#061a3a' }}></div>
        <span>Your Location (GPS)</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.origin}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, origin: event.target.checked }))
          }
        />
        <div className="legend-dot" style={{ background: '#0b2d6b' }}></div>
        <span>Origin</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.transfer}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, transfer: event.target.checked }))
          }
        />
        <div className="legend-dot" style={{ background: '#FFC107' }}></div>
        <span>Transfer</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.destination}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, destination: event.target.checked }))
          }
        />
        <div className="legend-dot" style={{ background: '#0b2d6b' }}></div>
        <span>Destination</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.vehicles}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, vehicles: event.target.checked }))
          }
        />
        <div className="legend-dot vehicle-dot"></div>
        <span>Live Vehicles</span>
      </label>
      {legendVisibility.vehicles && (
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>Live Updates</span>
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;
