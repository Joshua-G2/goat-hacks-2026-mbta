import React, { useState, useEffect, useMemo } from 'react';
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

const ORANGE_LINE_COLOR = '#FF6A00';

// Component to center map on user location
function LocationMarker({ position }) {
  if (!position) return null;

  return (
    <CircleMarker
      center={position}
      radius={9}
      pane="userLocation"
      className="user-location-marker"
      pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 0.95 }}
    >
      <Popup>
        <strong>🎮 You</strong>
        <div>Your current position</div>
      </Popup>
    </CircleMarker>
  );
}

function FitBounds({ origin, destination, transfers = [], allowAutoFit, onFit }) {
  const map = useMap();

  useEffect(() => {
    if (allowAutoFit && origin && destination) {
      const extraPoints = transfers.filter(Boolean);
      const bounds = L.latLngBounds([origin, destination, ...extraPoints]);
      map.fitBounds(bounds, {
        paddingTopLeft: [200, 80],
        paddingBottomRight: [80, 80],
        maxZoom: 13,
      });
      onFit?.();
    }
  }, [origin, destination, transfers, map, allowAutoFit, onFit]);

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

function TripControlStack({ origin, destination, transfers = [], userLocation, onReset }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const control = L.control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar trip-control-stack');
      const userButton = L.DomUtil.create('button', 'trip-control-button user-location-button', container);
      userButton.type = 'button';
      userButton.title = 'Center on your location';
      userButton.setAttribute('aria-label', 'Center on your location');
      userButton.innerHTML = '<span class="user-location-icon" aria-hidden="true"></span>';

      const tripButton = L.DomUtil.create('button', 'trip-control-button trip-reset-button', container);
      tripButton.type = 'button';
      tripButton.title = 'Recenter trip';
      tripButton.setAttribute('aria-label', 'Recenter trip');
      tripButton.innerHTML = '<span class="trip-reset-icon" aria-hidden="true"></span>';

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(userButton, 'click', L.DomEvent.stop);
      L.DomEvent.on(tripButton, 'click', L.DomEvent.stop);

      L.DomEvent.on(userButton, 'click', () => {
        if (userLocation) {
          map.setView(userLocation, Math.max(map.getZoom(), 15));
        }
      });

      L.DomEvent.on(tripButton, 'click', () => {
        onReset?.();
        if (origin && destination) {
          const extraPoints = transfers.filter(Boolean);
          const bounds = L.latLngBounds([origin, destination, ...extraPoints]);
          map.fitBounds(bounds, {
            paddingTopLeft: [200, 80],
            paddingBottomRight: [80, 80],
            maxZoom: 13,
          });
        }
      });
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, onReset, origin, destination, userLocation]);

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
  onTransferStationsChange,
  showLegend = true,
  debugEnabled: controlledDebugEnabled,
  onDebugEnabledChange,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [stopMarkers, setStopMarkers] = useState([]);
  const [routeShapes, setRouteShapes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleRouteTypes, setVehicleRouteTypes] = useState({});
  const [routeColors, setRouteColors] = useState({});
  const [routeTypes, setRouteTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [debugEnabled] = useState(false);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [mouseScreenPos, setMouseScreenPos] = useState(null);
  const [selectedRouteShape, setSelectedRouteShape] = useState(null);
  const [autoFitEnabled, setAutoFitEnabled] = useState(true);
  const [legendVisibility, setLegendVisibility] = useState({
    user: true,
    origin: true,
    transfer: true,
    destination: true,
    stations: true,
    stationLines: {
      commuter: true,
      red: true,
      orange: true,
      blue: true,
      green: true,
      mattapan: true,
    },
    trains: false,
    buses: false,
    ferries: false,
  });
  const activeLegendVisibility = controlledLegendVisibility
    ? {
        ...legendVisibility,
        ...controlledLegendVisibility,
        stationLines: {
          ...legendVisibility.stationLines,
          ...controlledLegendVisibility.stationLines,
        },
      }
    : legendVisibility;
  const updateLegendVisibility = onLegendVisibilityChange || setLegendVisibility;
  const activeDebugEnabled =
    typeof controlledDebugEnabled === 'boolean' ? controlledDebugEnabled : debugEnabled;

  const getStationGroupsFromRouteIds = (routeIds, routeTypeLookup) => {
    if (!Array.isArray(routeIds) || routeIds.length === 0) return [];
    const groups = new Set();
    if (routeIds.some((routeId) => routeId?.toLowerCase().includes('mattapan'))) {
      groups.add('mattapan');
    }
    if (routeIds.some((routeId) => routeTypeLookup[routeId] === 2)) {
      groups.add('commuter');
    }
    const normalized = routeIds.map((routeId) => routeId?.toLowerCase() || '');
    if (normalized.some((routeId) => routeId.startsWith('red'))) groups.add('red');
    if (normalized.some((routeId) => routeId.startsWith('orange'))) groups.add('orange');
    if (normalized.some((routeId) => routeId.startsWith('blue'))) groups.add('blue');
    if (normalized.some((routeId) => routeId.startsWith('green'))) groups.add('green');
    return Array.from(groups);
  };

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
        
        // Fetch subway + commuter rail routes
        const routesData = await MBTA_API.getRoutes({ type: '0,1,2' });
        setRoutes(routesData.data || []);

        // Fetch all stations for each route to capture route membership
        const routeColorById = new Map();
        const routeTypeById = new Map();
        (routesData.data || []).forEach((route) => {
          if (route?.attributes?.color) {
            routeColorById.set(route.id, route.attributes.color);
          }
          if (typeof route?.attributes?.type === 'number') {
            routeTypeById.set(route.id, route.attributes.type);
          }
        });

        const stopMap = new Map();
        await Promise.all(
          (routesData.data || []).map(async (route) => {
            try {
              const routeStops = await MBTA_API.getStops({
                route: route.id,
                location_type: 1,
              });
              (routeStops.data || []).forEach((stop) => {
                const existing = stopMap.get(stop.id);
                if (existing) {
                  existing.routeIds.add(route.id);
                } else {
                  stopMap.set(stop.id, {
                    ...stop,
                    routeIds: new Set([route.id]),
                  });
                }
              });
            } catch (error) {
              console.error(`Error loading stops for route ${route.id}:`, error);
            }
          })
        );

        const markers = Array.from(stopMap.values()).map((stop) => ({
          ...stop,
          routeIds: Array.from(stop.routeIds || []),
        }));

        const transferStationList = markers.filter((stop) => {
          const groups = getStationGroupsFromRouteIds(stop.routeIds, routeTypeById);
          return groups.length >= 2;
        });

        onTransferStationsChange?.(transferStationList);
        setStops(markers);
        setStopMarkers(markers);
        setRouteColors(Object.fromEntries(routeColorById));
        setRouteTypes(Object.fromEntries(routeTypeById));

        setLoading(false);
        onDataUpdated();
      } catch (error) {
        console.error('Error loading MBTA data:', error);
        setLoading(false);
      }
    };

    loadMBTAData();
  }, [onTransferStationsChange]);

  // Load route shapes when routes change
  useEffect(() => {
    const loadRouteShapes = async () => {
      const shapes = [];
      await Promise.all(
        routes.map(async (route) => {
          try {
            const shapeData = await MBTA_API.getShapes(route.id);
            if (shapeData.data && shapeData.data.length > 0) {
              shapeData.data.forEach((shape, index) => {
                const coordinates = shape.attributes.polyline
                  ? decodePolyline(shape.attributes.polyline)
                  : [];
                if (coordinates.length > 0) {
                  const shapeColor = route.id?.toLowerCase().includes('mattapan')
                    ? '#8B1E1E'
                    : `#${route.attributes.color}` || '#000000';
                  shapes.push({
                    id: `${route.id}-${index}`,
                    routeId: route.id,
                    group: getRouteGroup(route.id),
                    coordinates,
                    color: shapeColor,
                  });
                }
              });
            }
          } catch (error) {
            console.error(`Error loading shape for route ${route.id}:`, error);
          }
        })
      );

      setRouteShapes(shapes);
      onDataUpdated();
    };

    if (routes.length > 0) {
      loadRouteShapes();
    }
  }, [routes, routeTypes]);

  // Load live vehicle positions every 10 seconds
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vehicleData = await MBTA_API.getVehicles(null);
        if (vehicleData.data) {
          setVehicles(vehicleData.data);
          const routeTypeMap = {};
          (vehicleData.included || [])
            .filter((item) => item.type === 'route')
            .forEach((route) => {
              if (route?.id && typeof route?.attributes?.type === 'number') {
                routeTypeMap[route.id] = route.attributes.type;
              }
            });
          setVehicleRouteTypes(routeTypeMap);
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
      transfer: '#9C27B0',
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

  const createDualStopIcon = (colorA, colorB, isSelected) => {
    const size = isSelected ? 18 : 12;
    return L.divIcon({
      className: 'dual-stop-marker',
      html: `<div class="dual-stop-marker-inner" style="--color-a: ${colorA}; --color-b: ${colorB}; width: ${size}px; height: ${size}px;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Create vehicle icon
  const createVehicleIcon = (iconType) => {
    const iconPath = iconType === 'bus' ? 'bus.svg' : iconType === 'ferry' ? 'ferry.svg' : 'train.svg';
    return L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="width: 20px; height: 20px; border-radius: 6px; border: 2px solid white; background-color: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); background-image: url('/src/assets/${iconPath}'); background-repeat: no-repeat; background-position: center; background-size: 14px 14px;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getStopCoordinates = (stop) => {
    const latitude = stop?.attributes?.latitude ?? stop?.latitude;
    const longitude = stop?.attributes?.longitude ?? stop?.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return [latitude, longitude];
  };

  const getStopName = (stop) => stop?.attributes?.name || stop?.name || '';

  const originPosition = useMemo(() => {
    const coords = getStopCoordinates(selectedStops?.origin);
    return coords ? [coords[0], coords[1]] : null;
  }, [
    selectedStops?.origin?.attributes?.latitude,
    selectedStops?.origin?.attributes?.longitude,
    selectedStops?.origin?.latitude,
    selectedStops?.origin?.longitude,
  ]);

  const destinationPosition = useMemo(() => {
    const coords = getStopCoordinates(selectedStops?.destination);
    return coords ? [coords[0], coords[1]] : null;
  }, [
    selectedStops?.destination?.attributes?.latitude,
    selectedStops?.destination?.attributes?.longitude,
    selectedStops?.destination?.latitude,
    selectedStops?.destination?.longitude,
  ]);
  const transferPosition = useMemo(() => {
    const coords = getStopCoordinates(selectedStops?.transfer);
    return coords ? [coords[0], coords[1]] : null;
  }, [
    selectedStops?.transfer?.attributes?.latitude,
    selectedStops?.transfer?.attributes?.longitude,
    selectedStops?.transfer?.latitude,
    selectedStops?.transfer?.longitude,
  ]);
  useEffect(() => {
    if (originPosition && destinationPosition) {
      setAutoFitEnabled(true);
    }
  }, [originPosition, destinationPosition, transferPosition]);

  const getRouteIdsForStop = (stop) => {
    if (Array.isArray(stop?.routeIds) && stop.routeIds.length > 0) {
      return stop.routeIds.filter(Boolean);
    }
    const routeData =
      stop?.relationships?.routes?.data ||
      stop?.relationships?.route?.data;
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

  const normalizeHexColor = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    const normalized = hex.toUpperCase();
    if (/^[0-9A-F]{6}$/.test(normalized)) return `#${normalized}`;
    if (/^[0-9A-F]{3}$/.test(normalized)) {
      return `#${normalized.split('').map((char) => char + char).join('')}`;
    }
    return null;
  };

  const brightenHexColor = (value, amount = 0.2) => {
    const normalized = normalizeHexColor(value);
    if (!normalized) return null;
    const hex = normalized.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const mix = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount));
    return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  };

  const getFallbackLineColor = (routeId) => {
    const id = routeId?.toLowerCase() || '';
    if (id.includes('mattapan')) return '#8B1E1E';
    if (id.startsWith('red')) return '#DA291C';
    if (id.startsWith('blue')) return '#003DA5';
    if (id.startsWith('orange')) return ORANGE_LINE_COLOR;
    if (id.startsWith('green')) return '#00843D';
    return '#2196F3';
  };

  const getRouteTypeFallbackColor = (routeId) => {
    const routeType = routeTypes[routeId];
    if (routeType === 2) return '#7E3FF2'; // Commuter Rail
    if (routeType === 1) return '#DA291C'; // Heavy Rail
    if (routeType === 0) return '#00843D'; // Light Rail
    return null;
  };

  const getStopLineColor = (stop) => {
    const routeIds = getRouteIdsForStop(stop);

    if (routeIds.length === 0) return '#2196F3';

    const mattapanRoute = routeIds.find((routeId) => routeId?.toLowerCase().includes('mattapan'));
    if (mattapanRoute) return '#8B1E1E';

    const commuterRoute = routeIds.find((routeId) => routeTypes[routeId] === 2);
    if (commuterRoute) return '#7E3FF2';

    if (routeIds.some((routeId) => routeId?.toLowerCase().startsWith('orange'))) {
      return ORANGE_LINE_COLOR;
    }

    const apiColor = routeIds.map((routeId) => normalizeHexColor(routeColors[routeId])).find(Boolean);
    if (apiColor) return brightenHexColor(apiColor, 0.18);

    const typeFallback = routeIds.map((routeId) => getRouteTypeFallbackColor(routeId)).find(Boolean);
    if (typeFallback) return brightenHexColor(typeFallback, 0.18);

    return brightenHexColor(getFallbackLineColor(routeIds[0]), 0.18) || '#2196F3';
  };

  const getStationGroups = (stop) => {
    const routeIds = getRouteIdsForStop(stop);
    if (routeIds.length === 0) return [];

    const groups = new Set();

    if (routeIds.some((routeId) => routeId?.toLowerCase().includes('mattapan'))) {
      groups.add('mattapan');
    }

    if (routeIds.some((routeId) => routeTypes[routeId] === 2)) {
      groups.add('commuter');
    }

    const normalized = routeIds.map((routeId) => routeId?.toLowerCase() || '');
    if (normalized.some((routeId) => routeId.startsWith('red'))) groups.add('red');
    if (normalized.some((routeId) => routeId.startsWith('orange'))) groups.add('orange');
    if (normalized.some((routeId) => routeId.startsWith('blue'))) groups.add('blue');
    if (normalized.some((routeId) => routeId.startsWith('green'))) groups.add('green');

    return Array.from(groups);
  };

  const getRouteGroup = (routeId) => {
    const id = routeId?.toLowerCase() || '';
    if (id.includes('mattapan')) return 'mattapan';
    if (routeTypes[routeId] === 2) return 'commuter';
    if (id.startsWith('red')) return 'red';
    if (id.startsWith('orange')) return 'orange';
    if (id.startsWith('blue')) return 'blue';
    if (id.startsWith('green')) return 'green';
    return null;
  };

  const getStationGroupColors = (groups) => {
    const colorByGroup = {
      commuter: '#7E3FF2',
      red: '#DA291C',
      orange: ORANGE_LINE_COLOR,
      blue: '#003DA5',
      green: '#00843D',
      mattapan: '#8B1E1E',
    };
    const priority = ['red', 'orange', 'blue', 'green', 'mattapan', 'commuter'];
    const ordered = [
      ...priority.filter((group) => groups.includes(group)),
      ...groups.filter((group) => !priority.includes(group)),
    ];
    return ordered
      .map((group) => {
        const base = colorByGroup[group];
        if (!base) return null;
        if (group === 'mattapan' || group === 'orange') return base;
        return brightenHexColor(base, 0.18) || base;
      })
      .filter(Boolean);
  };

  const getRouteColor = (routeId) => {
    if (routeId?.toLowerCase().includes('mattapan')) return '#8B1E1E';
    if (routeId?.toLowerCase().startsWith('orange')) return ORANGE_LINE_COLOR;
    const matched = routes.find((route) => route.id === routeId);
    return matched?.attributes?.color ? `#${matched.attributes.color}` : '#1F2937';
  };

  const getVehicleStatusLabel = (status) => {
    if (!status) return 'In service';
    const normalized = status.toUpperCase();
    const labels = {
      INCOMING_AT: 'Arriving',
      STOPPED_AT: 'Stopped',
      IN_TRANSIT_TO: 'In transit',
    };
    if (labels[normalized]) return labels[normalized];
    return normalized
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (letter) => letter.toUpperCase());
  };

  const getVehicleIconType = (routeType) => {
    if (routeType === 3) return 'bus';
    if (routeType === 4) return 'ferry';
    return 'train';
  };

  const getVehicleLabel = (iconType) => {
    if (iconType === 'bus') return 'Live Bus';
    if (iconType === 'ferry') return 'Live Ferry';
    return 'Live Train';
  };

  const formatVehicleSpeed = (speed) => {
    if (typeof speed !== 'number') return '—';
    return `${Math.round(speed * 2.237)} mph`;
  };

  const getSelectedStopColor = () => '#0b2d6b';
  const getUserLocationColor = () => '#061a3a';

  const getStopLineBadges = (stop) => {
    const routeIds = getRouteIdsForStop(stop);
    const badges = [];
    const addBadge = (key, label, color, shape = 'pill') => {
      if (badges.some((badge) => badge.key === key)) return;
      badges.push({ key, label, color, shape });
    };

    if (routeIds.some((routeId) => routeId?.toLowerCase().includes('mattapan'))) {
      addBadge('mattapan', 'M', '#DA291C', 'circle');
    }

    if (routeIds.some((routeId) => routeTypes[routeId] === 2)) {
      addBadge('commuter', 'CR', '#7E3FF2');
    }

    if (routeIds.some((routeId) => routeId?.startsWith('Red'))) {
      addBadge('red', 'RL', '#DA291C');
    }

    if (routeIds.some((routeId) => routeId?.startsWith('Orange'))) {
      addBadge('orange', 'OL', ORANGE_LINE_COLOR);
    }

    if (routeIds.some((routeId) => routeId?.startsWith('Blue'))) {
      addBadge('blue', 'BL', '#003DA5');
    }

    if (routeIds.some((routeId) => routeId?.startsWith('Green'))) {
      addBadge('green', 'GL', '#00843D');
      const greenRoute = routeIds.find((routeId) => routeId?.startsWith('Green-'));
      const letter = greenRoute ? greenRoute.split('-')[1] : null;
      if (letter) {
        addBadge(`green-${letter}`, letter, '#00843D', 'circle');
      }
    }

    return badges;
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
        whenCreated={(map) => {
          map.on('movestart', () => setAutoFitEnabled(false));
          map.on('zoomstart', () => setAutoFitEnabled(false));
        }}
      >
        <Pane name="routeLines" style={{ zIndex: 400 }} />
        <Pane name="routeMotion" style={{ zIndex: 620 }} />
        <Pane name="stations" style={{ zIndex: 640 }} />
        <Pane name="selectedStops" style={{ zIndex: 650 }} />
        <Pane name="vehicles" style={{ zIndex: 680 }} />
        <Pane name="userLocation" style={{ zIndex: 700 }} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* User's live location */}
        {activeLegendVisibility.user && <LocationMarker position={userLocation} />}
        <FitBounds
          origin={originPosition}
          destination={destinationPosition}
          transfers={transferPosition ? [transferPosition] : []}
          allowAutoFit={autoFitEnabled}
          onFit={() => setAutoFitEnabled(false)}
        />
        <TripControlStack
          origin={originPosition}
          destination={destinationPosition}
          transfers={transferPosition ? [transferPosition] : []}
          userLocation={userLocation}
          onReset={() => setAutoFitEnabled(true)}
        />
        <DebugMouseTracker
          enabled={activeDebugEnabled}
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
        {routeShapes
          .filter((shape) => {
            if (!activeLegendVisibility.stations) return false;
            if (!shape.group) return true;
            return activeLegendVisibility.stationLines?.[shape.group] !== false;
          })
          .map((shape) => (
            <Polyline
              key={shape.id}
              pane="routeLines"
              positions={shape.coordinates}
              pathOptions={{ color: shape.color, weight: 4, opacity: 0.7 }}
            />
          ))}

        {/* MBTA Stations */}
        {activeLegendVisibility.stations && stopMarkers.map((stop) => {
          if (!stop.attributes.latitude || !stop.attributes.longitude) return null;

          const stationGroups = getStationGroups(stop);
          if (
            stationGroups.length > 0 &&
            !stationGroups.some((group) => activeLegendVisibility.stationLines?.[group])
          ) {
            return null;
          }

          const position = [stop.attributes.latitude, stop.attributes.longitude];
          let stopType = 'default';
          const isOrigin = selectedStops?.origin?.id === stop.id && activeLegendVisibility.origin;
          const isTransfer = selectedStops?.transfer?.id === stop.id && activeLegendVisibility.transfer;
          const isDestination = selectedStops?.destination?.id === stop.id && activeLegendVisibility.destination;

          if (isOrigin) stopType = 'origin';
          else if (isTransfer) stopType = 'transfer';
          else if (isDestination) stopType = 'destination';

          const isSelected = stopType !== 'default';
          const lineColor = getStopLineColor(stop);

          const stopBadges = getStopLineBadges(stop);
          const popup = (
            <Popup>
              <div className="stop-popup">
                {isTransfer && <strong>Transfer</strong>}
                <div className="stop-name-row">
                  {stopBadges.length > 0 && (
                    <div className="stop-line-badges inline">
                      {stopBadges.map((badge) => (
                        <span
                          key={badge.key}
                          className={`stop-line-badge ${badge.shape === 'circle' ? 'circle' : ''}`}
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <strong>{stop.attributes.name}</strong>
                </div>
                {isSelected && (
                  <div className="stop-type-badge">{stopType.toUpperCase()}</div>
                )}
                {stop.attributes.wheelchair_boarding === 1 ? (
                  <div className="accessibility-status centered">
                    <img src="/src/assets/accessible-icon.svg" alt="" />
                    <span>Accessible</span>
                  </div>
                ) : (
                  <div className="accessibility-status centered">
                    <img src="/src/assets/not-accessible.svg" alt="" />
                    <span>Not accessible</span>
                  </div>
                )}
              </div>
            </Popup>
          );

          const dualColors = getStationGroupColors(stationGroups);
          const isDual = dualColors.length >= 2 && !isTransfer;

          return (
            <React.Fragment key={stop.id}>
              {isDual ? (
                <Marker
                  position={position}
                  pane="stations"
                  icon={createDualStopIcon(dualColors[0], dualColors[1], isSelected)}
                >
                  {popup}
                </Marker>
              ) : (
                <CircleMarker
                  center={position}
                  pane="stations"
                  radius={isTransfer ? 10 : isSelected ? 8 : 5}
                  pathOptions={{
                    color: '#ffffff',
                    weight: isSelected ? 2.5 : 1.5,
                    fillColor: isTransfer ? '#9E9E9E' : lineColor,
                    fillOpacity: 0.9,
                  }}
                >
                  {popup}
                </CircleMarker>
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
        {vehicles.map((vehicle) => {
          if (!vehicle.attributes.latitude || !vehicle.attributes.longitude) return null;

          const position = [vehicle.attributes.latitude, vehicle.attributes.longitude];
          const routeId = vehicle.relationships?.route?.data?.id;
          const routeTypeFromRoute = routeId ? vehicleRouteTypes[routeId] : null;
          const routeType = vehicle.attributes?.route_type ?? routeTypeFromRoute ?? null;
          const iconType = getVehicleIconType(routeType);
          const isVisible =
            (iconType === 'train' && activeLegendVisibility.trains) ||
            (iconType === 'bus' && activeLegendVisibility.buses) ||
            (iconType === 'ferry' && activeLegendVisibility.ferries);
          if (!isVisible) return null;

          return (
            <Marker
              key={vehicle.id}
              position={position}
              pane="vehicles"
              icon={createVehicleIcon(iconType)}
            >
              <Popup>
                <div className="vehicle-popup">
                  <strong>{getVehicleLabel(iconType)}</strong>
                  <div>Status: {getVehicleStatusLabel(vehicle.attributes.current_status)}</div>
                  <div>Speed: {formatVehicleSpeed(vehicle.attributes.speed)}</div>
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
          selectedStopColor={getSelectedStopColor()}
        />
      )}

      {activeDebugEnabled && mouseLatLng && mouseScreenPos && (
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
  selectedStopColor = '#0b2d6b',
  className = '',
}) {
  const [stationsExpanded, setStationsExpanded] = useState(false);
  const stationLineOptions = [
    { key: 'commuter', label: 'Commuter Rail', color: '#7E3FF2' },
    { key: 'red', label: 'Red Line', color: '#DA291C' },
    { key: 'orange', label: 'Orange Line', color: ORANGE_LINE_COLOR },
    { key: 'blue', label: 'Blue Line', color: '#003DA5' },
    { key: 'green', label: 'Green Line', color: '#00843D' },
    { key: 'mattapan', label: 'Mattapan Trolley', color: '#8B1E1E' },
  ];

  const handleStationsToggle = (checked) => {
    onLegendVisibilityChange((prev) => ({
      ...prev,
      stations: checked,
      stationLines: Object.fromEntries(
        stationLineOptions.map((option) => [option.key, checked])
      ),
    }));
  };

  const handleStationLineToggle = (lineKey, checked) => {
    onLegendVisibilityChange((prev) => ({
      ...prev,
      stationLines: {
        ...prev.stationLines,
        [lineKey]: checked,
      },
    }));
  };

  return (
    <div className={`map-legend ${className}`.trim()}>
      <h4>🗺️ Legend</h4>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.user}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, user: event.target.checked }))
          }
        />
        <div className="legend-dot legend-user-dot" style={{ background: '#2563eb' }}></div>
        <span>Your Location</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.origin && legendVisibility.destination}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({
              ...prev,
              origin: event.target.checked,
              destination: event.target.checked,
            }))
          }
        />
        <div className="legend-dot" style={{ background: selectedStopColor }}></div>
        <span>Origin & Destination</span>
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
        <div className="legend-dot" style={{ background: '#9E9E9E' }}></div>
        <span>Transfer</span>
      </label>
      <div className="legend-item legend-item-stations">
        <label className="legend-item-label">
          <input
            className="legend-toggle"
            type="checkbox"
            checked={legendVisibility.stations}
            onChange={(event) => handleStationsToggle(event.target.checked)}
          />
          <div className="legend-dot legend-rainbow-dot"></div>
          <span>Stations</span>
        </label>
        <button
          type="button"
          className={`legend-dropdown-toggle ${stationsExpanded ? 'open' : ''}`}
          onClick={() => setStationsExpanded((prev) => !prev)}
          aria-label="Toggle station line filters"
        >
          <span className="legend-dropdown-icon">▾</span>
        </button>
      </div>
      {stationsExpanded && (
        <div className="legend-station-lines">
          {stationLineOptions.map((option) => (
            <label className="legend-item legend-subitem" key={option.key}>
              <input
                className="legend-toggle"
                type="checkbox"
                checked={legendVisibility.stationLines?.[option.key]}
                onChange={(event) =>
                  handleStationLineToggle(option.key, event.target.checked)
                }
              />
              <div className="legend-dot" style={{ background: option.color }}></div>
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.trains}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, trains: event.target.checked }))
          }
        />
        <div className="legend-icon">
          <img src="/src/assets/train.svg" alt="" />
        </div>
        <span>Live Trains</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.buses}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, buses: event.target.checked }))
          }
        />
        <div className="legend-icon">
          <img src="/src/assets/bus.svg" alt="" />
        </div>
        <span>Live Buses</span>
      </label>
      <label className="legend-item">
        <input
          className="legend-toggle"
          type="checkbox"
          checked={legendVisibility.ferries}
          onChange={(event) =>
            onLegendVisibilityChange((prev) => ({ ...prev, ferries: event.target.checked }))
          }
        />
        <div className="legend-icon">
          <img src="/src/assets/ferry.svg" alt="" />
        </div>
        <span>Live Ferries</span>
      </label>
    </div>
  );
}

export default InteractiveMap;
