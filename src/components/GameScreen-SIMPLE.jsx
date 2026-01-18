import { useState, useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useMBTAPolling } from '../services/mbtaService';
import MBTA_API from '../config/mbtaApi';
import Player3DMarker from './Player3DMarker';
import AnimatedGradientText from './AnimatedGradientText';
import GlitchText from './GlitchText';
import PointsTracker from './PointsTracker';
import BlurryBlob from './BlurryBlob';
import TicketUpload from './TicketUpload';
import AnimatedBorderTrail from './AnimatedBorderTrail';
import WalletConnect from './WalletConnect';
import { recordRideAndReward, checkSufficientBalance } from '../config/solanaRewardsProduction';
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
  console.log('🎮 GameScreen component rendering...');
  
  // Solana wallet integration
  const wallet = useWallet();
  console.log('👛 Wallet status:', { connected: wallet.connected, publicKey: wallet.publicKey?.toString() });
  
  // GPS
  const { position, status: gpsStatus } = useGPSTracking();
  const playerMarkerRef = useRef(null);
  
  // Game state
  const [ticketVerified, setTicketVerified] = useState(false);
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
  const [arrivingTrain, setArrivingTrain] = useState(null);
  const [demoTrain, setDemoTrain] = useState(null);
  const [demoTrainProgress, setDemoTrainProgress] = useState(0);
  const demoTrainIntervalRef = useRef(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationPredictions, setStationPredictions] = useState([]);
  
  // Transfer system state
  const [transferStation, setTransferStation] = useState(null);
  const [waitingForTransfer, setWaitingForTransfer] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [targetRoute, setTargetRoute] = useState(null);
  const [journeyPlan, setJourneyPlan] = useState([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  
  // Blockchain transaction tracking
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [pendingTransaction, setPendingTransaction] = useState(false);
  const [lastTransactionSignature, setLastTransactionSignature] = useState(null);
  
  // Map data
  const [routeShapes, setRouteShapes] = useState([]);
  const [stops, setStops] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Live trains - DISABLED FOR DEMO MODE
  const { vehicles } = useMBTAPolling({
    routeIds: ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'],
    interval: 8000,
    enabled: false // Demo mode - no live trains
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

  // Major interchange stations by route
  const INTERCHANGE_STATIONS = {
    'place-dwnxg': { name: 'Downtown Crossing', routes: ['Red', 'Orange'] },
    'place-state': { name: 'State', routes: ['Blue', 'Orange'] },
    'place-gover': { name: 'Government Center', routes: ['Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'] },
    'place-park': { name: 'Park Street', routes: ['Red', 'Green-B', 'Green-C', 'Green-D', 'Green-E'] },
    'place-north': { name: 'North Station', routes: ['Orange', 'Green-C', 'Green-E'] },
    'place-haecl': { name: 'Haymarket', routes: ['Orange', 'Green-C', 'Green-E'] },
    'place-boyls': { name: 'Boylston', routes: ['Green-B', 'Green-C', 'Green-D', 'Green-E'] },
    'place-kencl': { name: 'Kenmore', routes: ['Green-B', 'Green-C', 'Green-D'] },
  };

  // Find which routes serve a station
  const getStationRoutes = (stationId) => {
    const interchange = INTERCHANGE_STATIONS[stationId];
    if (interchange) return interchange.routes;
    
    // For non-interchange stations, check which route they're on
    const station = stops.find(s => s.id === stationId);
    if (!station) return [];
    
    // Get routes from relationships
    if (station.relationships?.route?.data) {
      if (Array.isArray(station.relationships.route.data)) {
        return station.relationships.route.data.map(r => r.id);
      } else {
        return [station.relationships.route.data.id];
      }
    }
    return [];
  };

  // Plan journey with transfers
  const planJourney = (start, end) => {
    const startRoutes = getStationRoutes(start.id);
    const endRoutes = getStationRoutes(end.id);
    
    console.log('[Journey] Start station routes:', startRoutes);
    console.log('[Journey] End station routes:', endRoutes);
    
    // Check if direct route exists
    const commonRoute = startRoutes.find(r => endRoutes.includes(r));
    
    if (commonRoute) {
      console.log('[Journey] Direct route found:', commonRoute);
      return [{
        from: start,
        to: end,
        route: commonRoute,
        isTransfer: false
      }];
    }
    
    // Need transfer - find interchange station
    console.log('[Journey] Transfer needed');
    
    // Find best interchange station
    let bestTransfer = null;
    for (const [stationId, info] of Object.entries(INTERCHANGE_STATIONS)) {
      const hasStartRoute = info.routes.some(r => startRoutes.includes(r));
      const hasEndRoute = info.routes.some(r => endRoutes.includes(r));
      
      if (hasStartRoute && hasEndRoute) {
        const transferStation = stops.find(s => s.id === stationId);
        if (transferStation) {
          bestTransfer = transferStation;
          break;
        }
      }
    }
    
    if (!bestTransfer) {
      console.log('[Journey] No transfer station found, using Park Street');
      bestTransfer = stops.find(s => s.id === 'place-park') || stops.find(s => s.attributes.name.includes('Park'));
    }
    
    if (!bestTransfer) {
      console.log('[Journey] Fallback to direct route');
      return [{
        from: start,
        to: end,
        route: startRoutes[0] || 'Red',
        isTransfer: false
      }];
    }
    
    const transferRoutes = getStationRoutes(bestTransfer.id);
    const firstRoute = startRoutes.find(r => transferRoutes.includes(r)) || startRoutes[0];
    const secondRoute = endRoutes.find(r => transferRoutes.includes(r)) || endRoutes[0];
    
    console.log('[Journey] Transfer at:', bestTransfer.attributes.name);
    console.log('[Journey] First leg:', start.attributes.name, '→', bestTransfer.attributes.name, 'via', firstRoute);
    console.log('[Journey] Second leg:', bestTransfer.attributes.name, '→', end.attributes.name, 'via', secondRoute);
    
    return [
      {
        from: start,
        to: bestTransfer,
        route: firstRoute,
        isTransfer: false
      },
      {
        from: bestTransfer,
        to: end,
        route: secondRoute,
        isTransfer: true,
        transferAt: bestTransfer
      }
    ];
  };

  const handleStartGame = () => {
    console.log('[GameScreen] START GAME clicked');
    if (startStation && destination) {
      const plan = planJourney(startStation, destination);
      setJourneyPlan(plan);
      setCurrentLegIndex(0);
      console.log('[Journey] Plan:', plan);
    }
    setGameStarted(true);
  };

  const handleBoardTrain = (train) => {
    console.log('[GameScreen] Boarding train:', train.routeId);
    setShowWaveGoodbye(true);
    setWaitingForTransfer(false);
    setTimeout(() => {
      setShowWaveGoodbye(false);
      setIsOnTrain(true);
      setCurrentTrain(train);
      setWaitingForTrain(false);
      setNearbyTrains([]);
      lastPositionRef.current = { lat: train.latitude, lng: train.longitude };
      
      // Start demo train movement animation from start to destination
      // Use current leg's destination (could be transfer station or final destination)
      const currentLeg = journeyPlan[currentLegIndex];
      const legDestination = currentLeg?.to || destination;
      
      if (startStation && legDestination && demoTrain) {
        console.log('[Demo] Starting train movement animation to', legDestination.attributes.name);
        let progress = 0;
        const startLat = startStation.attributes.latitude;
        const startLng = startStation.attributes.longitude;
        const destLat = legDestination.attributes.latitude;
        const destLng = legDestination.attributes.longitude;
        
        demoTrainIntervalRef.current = setInterval(() => {
          progress += 1; // Increase by 1% every interval
          setDemoTrainProgress(progress);
          
          // Interpolate position
          const lat = startLat + (destLat - startLat) * (progress / 100);
          const lng = startLng + (destLng - startLng) * (progress / 100);
          
          setDemoTrain(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
          
          setCurrentTrain(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
          
          if (progress >= 100) {
            clearInterval(demoTrainIntervalRef.current);
            demoTrainIntervalRef.current = null;
            setCanOffboard(true);
            console.log('[Demo] Train reached destination');
          }
        }, 100); // Update every 100ms for smooth animation (10 seconds total)
      }
    }, 2000);
  };

  const handleOffboard = async () => {
    console.log('[GameScreen] Off-boarding');
    
    // Clear demo train animation
    if (demoTrainIntervalRef.current) {
      clearInterval(demoTrainIntervalRef.current);
      demoTrainIntervalRef.current = null;
    }
    
    setIsOnTrain(false);
    setCanOffboard(false);
    setCurrentTrain(null);
    setDemoTrain(null);
    setDemoTrainProgress(0);
    
    // Check if this is a transfer or final destination
    if (currentLegIndex < journeyPlan.length - 1) {
      // This is a transfer station
      const nextLeg = journeyPlan[currentLegIndex + 1];
      console.log('[Transfer] Arrived at transfer station:', nextLeg.from.attributes.name);
      console.log('[Transfer] Next leg to:', nextLeg.to.attributes.name, 'via', nextLeg.route);
      
      setTransferStation(nextLeg.from);
      setWaitingForTransfer(true);
      setCurrentRoute(nextLeg.route);
      setStartStation(nextLeg.from); // Update start for next leg
      setCurrentLegIndex(currentLegIndex + 1);
      
      // Clear predictions and wait for new ones
      setTrainPredictions([]);
      setNearbyTrains([]);
      
      // Record transfer on blockchain
      if (wallet.connected && wallet.publicKey) {
        console.log('🔗 Recording transfer on blockchain + sending SOL reward...');
        setPendingTransaction(true);
        
        try {
          // Check balance first
          const balanceCheck = await checkSufficientBalance(wallet.publicKey);
          if (!balanceCheck.hasSufficientBalance) {
            alert(`⚠️ Insufficient SOL for transaction. You need ${balanceCheck.feeRequired} SOL. Get devnet SOL from faucet.`);
            setPendingTransaction(false);
            return;
          }

          const currentLeg = journeyPlan[currentLegIndex];
          const rideData = {
            type: 'TRANSFER',
            from: currentLeg?.from?.attributes?.name || 'Unknown',
            to: currentLeg?.to?.attributes?.name || 'Unknown',
            line: currentLeg?.route || 'Unknown',
            points: Math.floor(distanceTraveled * 50),
            timestamp: Date.now()
          };
          
          console.log('🔄 Recording transfer on blockchain:', rideData);
          const result = await recordRideAndReward(wallet, rideData);
          
          if (result.success) {
            console.log('✅ Transfer recorded on blockchain:', result.signature);
            console.log('💰 SOL reward sent:', result.reward?.solEarned, 'SOL');
            setLastTransactionSignature(result.signature);
            setTransactionHistory(prev => [...prev, {
              ...result,
              timestamp: Date.now()
            }]);
            
            // Show success message
            alert(`✅ Transfer recorded on blockchain!\n💰 Earned ${result.reward?.solEarned} SOL for ${rideData.points} points!\n🔗 View on Explorer`);
          } else {
            if (result.error?.includes('cancelled')) {
              console.log('⚠️ Transaction cancelled by user');
            } else {
              alert(`❌ Failed to record transfer: ${result.error}`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to record transfer:', error);
          alert(`❌ Error: ${error.message}`);
        } finally {
          setPendingTransaction(false);
        }
      }
    } else {
      // Final destination reached
      console.log('[GameScreen] Reached final destination');
      const points = Math.floor(distanceTraveled * 100); // 100 points per mile
      setTotalPoints(points);
      setGameWon(true);
      setWaitingForTransfer(false);
      setTransferStation(null);
      
      // Record completed journey on blockchain
      if (wallet.connected && wallet.publicKey) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔗 RECORDING JOURNEY ON BLOCKCHAIN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Wallet:', wallet.publicKey.toBase58());
        console.log('🎮 Points Earned:', points);
        console.log('💰 SOL Reward:', (points * 0.001), 'SOL');
        setPendingTransaction(true);
        
        try {
          // Check balance first
          console.log('⚖️ Checking SOL balance for transaction fees...');
          const balanceCheck = await checkSufficientBalance(wallet.publicKey);
          console.log('💼 Balance Check:', balanceCheck);
          
          if (!balanceCheck.hasSufficientBalance) {
            console.error('❌ Insufficient SOL for transaction!');
            alert(`⚠️ Insufficient SOL for transaction. You need ${balanceCheck.feeRequired} SOL. Get devnet SOL from faucet.`);
            setPendingTransaction(false);
            return;
          }
          
          console.log('✅ Sufficient balance. Proceeding with transaction...');

          const currentLeg = journeyPlan[currentLegIndex];
          const firstLeg = journeyPlan[0];
          
          const rideData = {
            type: 'JOURNEY_COMPLETE',
            from: firstLeg?.from?.attributes?.name || origin?.attributes?.name || 'Unknown',
            to: currentLeg?.to?.attributes?.name || destination?.attributes?.name || 'Unknown',
            legs: journeyPlan.length,
            totalDistance: distanceTraveled,
            points: points,
            timestamp: Date.now()
          };
          
          console.log('📦 Ride Data:', rideData);
          console.log('🚀 Calling recordRideAndReward...');
          console.log('⏳ PHANTOM WALLET POPUP SHOULD APPEAR NOW!');
          
          const result = await recordRideAndReward(wallet, rideData);
          
          console.log('📥 Transaction Result:', result);
          
          if (result.success) {
            console.log('✅ Journey recorded on blockchain:', result.signature);
            console.log('💰 SOL reward sent:', result.reward?.solEarned, 'SOL');
            console.log('🔗 Explorer URL:', result.explorerUrl);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            setLastTransactionSignature(result.signature);
            setTransactionHistory(prev => [...prev, {
              ...result,
              timestamp: Date.now()
            }]);
            
            // Show success message with reward
            setTimeout(() => {
              alert(`🎉 JOURNEY COMPLETE!\n✅ Recorded on blockchain\n💰 Earned ${result.reward?.solEarned} SOL for ${points} points!\n🔗 View on Solana Explorer`);
            }, 500);
          } else {
            if (result.error?.includes('cancelled')) {
              console.log('⚠️ Transaction cancelled by user');
            } else {
              alert(`❌ Failed to record journey: ${result.error}`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to record journey:', error);
          alert(`❌ Error: ${error.message}`);
        } finally {
          setPendingTransaction(false);
        }
      }
    }
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

  // DEMO MODE: Create simulated train after selecting both stations
  useEffect(() => {
    if (!gameStarted || !startStation || !destination || demoTrain) return;
    
    // Use route from journey plan if available
    const currentLeg = journeyPlan[currentLegIndex];
    const routeId = currentLeg?.route || ['Red', 'Orange', 'Blue', 'Green-B'][Math.floor(Math.random() * 4)];
    
    console.log('[Demo] Creating simulated train on', routeId, 'line for leg', currentLegIndex);
    
    // Wait 2 seconds, then spawn demo train at start station
    setTimeout(() => {
      const train = {
        id: 'demo-train-1',
        routeId: routeId,
        latitude: startStation.attributes.latitude,
        longitude: startStation.attributes.longitude,
        currentStatus: 'At station',
        distance: 0
      };
      
      setDemoTrain(train);
      setNearbyTrains([train]);
      setArrivingTrain(train);
      setShowTrainArrival(true);
      
      setTimeout(() => setShowTrainArrival(false), 2000);
    }, 2000);
  }, [gameStarted, startStation, destination, demoTrain]);

  const handleRestart = () => {
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    if (demoTrainIntervalRef.current) {
      clearInterval(demoTrainIntervalRef.current);
      demoTrainIntervalRef.current = null;
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
    setDemoTrain(null);
    setDemoTrainProgress(0);
    setSelectedStation(null);
    setStationPredictions([]);
  };

  const handleStationClick = async (stop) => {
    setSelectedStation(stop);
    try {
      const response = await MBTA_API.getPredictions(stop.id);
      if (response.data) {
        const predictions = response.data
          .filter(pred => pred.attributes.arrival_time)
          .map(pred => ({
            id: pred.id,
            routeId: pred.relationships?.route?.data?.id || 'Unknown',
            arrivalTime: pred.attributes.arrival_time,
            minutesAway: Math.round((new Date(pred.attributes.arrival_time) - new Date()) / 60000),
            direction: pred.attributes.direction_id,
            status: pred.attributes.status,
            headsign: pred.attributes.trip_headsign
          }))
          .filter(pred => pred.minutesAway >= 0 && pred.minutesAway <= 60)
          .sort((a, b) => a.minutesAway - b.minutesAway)
          .slice(0, 5);
        setStationPredictions(predictions);
      }
    } catch (err) {
      console.error('Failed to fetch station predictions:', err);
      setStationPredictions([]);
    }
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
    <div className="game-screen-simple relative">
      <BlurryBlob />
      
      {/* Ticket Upload Modal - Stylish Popup */}
      {!ticketVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(102, 126, 234, 0.4)', backdropFilter: 'blur(10px)'}}>
          <div style={{background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(30px)', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 30px 90px rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.5)'}}>
            <TicketUpload onVerified={() => setTicketVerified(true)} />
          </div>
        </div>
      )}

      {/* Train Arrival Animation - Glitch text version */}
      {showTrainArrival && arrivingTrain && startStation && destination && (
        <div className="animation-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{
            fontSize: '120px',
            animation: 'slideIn 0.5s ease-out',
            marginBottom: '20px'
          }}>
            🚆
          </div>
          <GlitchText className="text-6xl mb-6">
            {arrivingTrain.routeId} Line Arriving!
          </GlitchText>
          <div style={{fontSize: '28px', color: '#fbbf24', marginTop: '15px'}}>
            From {startStation.attributes.name}
          </div>
          <div style={{fontSize: '28px', color: '#10b981', marginTop: '8px'}}>
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
          <GlitchText className="text-5xl mt-8">
            All Aboard!
          </GlitchText>
        </div>
      )}



      {/* Station Info Popup - WRTA Style with Pink Theme */}
      {selectedStation && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '20px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(252, 231, 243, 0.98) 100%)',
          backdropFilter: 'blur(30px)',
          borderRadius: '20px',
          padding: '20px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(236, 72, 153, 0.3)',
          border: '2px solid rgba(236, 72, 153, 0.2)'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 className="font-display" style={{fontSize: '1.3rem', fontWeight: 700, color: '#be185d', margin: 0}}>
              {selectedStation.attributes.name}
            </h3>
            <button 
              onClick={() => setSelectedStation(null)}
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >×</button>
          </div>
          
          {stationPredictions.length > 0 ? (
            <div>
              <div className="font-sans" style={{fontSize: '0.85rem', fontWeight: 600, color: '#be185d', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                Upcoming Arrivals
              </div>
              {stationPredictions.map(pred => {
                const direction = pred.direction === 0 ? 'Outbound' : pred.direction === 1 ? 'Inbound' : '';
                return (
                  <div key={pred.id} style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${ROUTE_COLORS[pred.routeId] || '#ec4899'}`,
                    border: '1px solid rgba(236, 72, 153, 0.15)'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                          <div className="font-display" style={{fontWeight: 700, fontSize: '1rem', color: ROUTE_COLORS[pred.routeId] || '#ec4899'}}>
                            {pred.routeId} Line
                          </div>
                          {direction && (
                            <span style={{
                              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              letterSpacing: '0.05em'
                            }}>
                              {direction}
                            </span>
                          )}
                        </div>
                        {pred.headsign && (
                          <div className="font-sans" style={{fontSize: '0.85rem', color: '#be185d', marginTop: '2px', fontWeight: 500}}>
                            → {pred.headsign}
                          </div>
                        )}
                      </div>
                      <div style={{textAlign: 'right', marginLeft: '12px'}}>
                        <div className="font-display" style={{fontWeight: 700, fontSize: '1.1rem', color: '#ec4899'}}>
                          {pred.minutesAway === 0 ? 'Arriving' : `${pred.minutesAway} min`}
                        </div>
                        {pred.status && (
                          <div className="font-sans" style={{fontSize: '0.75rem', color: '#a855f7'}}>
                            {pred.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="font-sans" style={{color: '#be185d', textAlign: 'center', padding: '20px', fontSize: '0.95rem', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '12px'}}>
              No upcoming arrivals in the next hour
            </div>
          )}
        </div>
      )}

      {/* Top HUD - Elegant Glass Morphism */}
      <div className="hud-top font-sans" style={{display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px'}}>
        {/* Wallet Connect - Top Left */}
        <div style={{position: 'fixed', top: '15px', left: '15px', zIndex: 1000}}>
          <WalletConnect />
        </div>
        
        <AnimatedBorderTrail size="small" trailColor="from-accent-400 to-primary-500">
          <div className="hud-item" style={{padding: '12px 24px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', backdropFilter: 'blur(10px)'}}>
            <strong className="font-display" style={{color: 'rgba(255, 255, 255, 0.95)'}}>Distance:</strong> 
            <span style={{color: 'white'}}>{distanceTraveled.toFixed(2)} mi</span>
          </div>
        </AnimatedBorderTrail>
        
        {/* Transaction History Panel */}
        {wallet.connected && transactionHistory.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '15px',
            right: '15px',
            zIndex: 998,
            maxWidth: '350px'
          }}>
            <AnimatedBorderTrail>
              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                borderRadius: '12px',
                padding: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔗</span>
                  <h3 className="text-white font-semibold text-sm">Blockchain History</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactionHistory.slice(-5).reverse().map((tx, index) => (
                    <div key={index} className="text-xs p-2 bg-purple-500/10 rounded border border-purple-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-purple-300 font-medium">{tx.data?.type || 'Transaction'}</span>
                        <span className="text-green-400">✓</span>
                      </div>
                      <div className="text-slate-400 text-xs mb-1">
                        {tx.data?.from && tx.data?.to && (
                          <div>{tx.data.from} → {tx.data.to}</div>
                        )}
                      </div>
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View on Explorer →
                      </a>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500 text-center">
                  All transactions are verifiable on-chain
                </div>
              </div>
            </AnimatedBorderTrail>
          </div>
        )}
      </div>

      {/* Win Screen - Elegant Gaming Celebration */}
      {gameWon && (
        <div className="win-overlay">
          <AnimatedBorderTrail size="large">
            <div className="win-box" style={{background: 'rgba(15, 23, 42, 0.98)', padding: '50px', textAlign: 'center', borderRadius: '20px', maxWidth: '600px'}}>
              <div style={{
                fontSize: '120px',
                animation: 'jump 0.6s ease-in-out infinite',
                marginBottom: '25px'
              }}>
                🎉
              </div>
              <GlitchText className="text-6xl mb-6 font-game">
                Destination Reached!
              </GlitchText>
              <AnimatedGradientText className="text-5xl block mb-6 font-game">
                +{totalPoints} Points!
              </AnimatedGradientText>
              <p className="win-xp text-2xl mb-6 text-slate-300 font-display">Distance: {distanceTraveled.toFixed(2)} miles</p>
              
              {/* Blockchain Verification Section */}
              {wallet.connected && lastTransactionSignature && (
                <div className="mb-8 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🔗</span>
                    <span className="text-lg font-semibold text-purple-300">Verified on Blockchain</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">Your journey is permanently recorded on Solana</p>
                  <a
                    href={`https://explorer.solana.com/tx/${lastTransactionSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    View on Solana Explorer →
                  </a>
                </div>
              )}
              
              {pendingTransaction && (
                <div className="mb-6 text-yellow-400 text-sm flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  <span>Recording on blockchain + sending SOL reward...</span>
                </div>
              )}
              
              <AnimatedBorderTrail size="medium">
                <button className="btn-primary font-game" onClick={handleRestart} style={{padding: '15px 50px', fontSize: '1.3rem'}}>
                  <AnimatedGradientText>🎮 Play Again</AnimatedGradientText>
                </button>
              </AnimatedBorderTrail>
            </div>
          </AnimatedBorderTrail>
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

          {/* Stations - Clickable */}
          <Pane name="stations" style={{ zIndex: 450 }}>
            {stops.map((stop) => {
              const lat = stop?.attributes?.latitude;
              const lng = stop?.attributes?.longitude;
              if (typeof lat !== 'number' || typeof lng !== 'number') return null;
              const isSelected = selectedStation?.id === stop.id;
              return (
                <Circle
                  key={stop.id}
                  center={[lat, lng]}
                  radius={isSelected ? 25 : 15}
                  pathOptions={{
                    color: isSelected ? '#667eea' : '#fff',
                    weight: isSelected ? 3 : 2,
                    fillColor: isSelected ? '#667eea' : '#334155',
                    fillOpacity: 1
                  }}
                  eventHandlers={{
                    click: () => handleStationClick(stop)
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

          {/* Transfer station marker */}
          {transferStation && waitingForTransfer &&
            typeof transferStation?.attributes?.latitude === 'number' &&
            typeof transferStation?.attributes?.longitude === 'number' && (
            <Marker
              position={[transferStation.attributes.latitude, transferStation.attributes.longitude]}
              icon={L.divIcon({
                className: 'transfer-marker',
                html: `<div style="font-size: 48px; animation: pulse 1.5s infinite;">🔄</div>`,
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

          {/* Demo train - VISIBLE with emoji marker */}
          <Pane name="trains" style={{ zIndex: 500 }}>
            {demoTrain && demoTrain.latitude && demoTrain.longitude && (
              <>
                <Circle
                  key={demoTrain.id}
                  center={[demoTrain.latitude, demoTrain.longitude]}
                  radius={80}
                  pathOptions={{
                    color: ROUTE_COLORS[demoTrain.routeId] || '#666',
                    fillColor: ROUTE_COLORS[demoTrain.routeId] || '#666',
                    fillOpacity: 0.9,
                    weight: 4
                  }}
                />
                <Marker
                  position={[demoTrain.latitude, demoTrain.longitude]}
                  icon={L.divIcon({
                    className: 'train-marker',
                    html: `<div style="font-size: 36px; filter: drop-shadow(0 0 8px ${ROUTE_COLORS[demoTrain.routeId] || '#666'});">🚆</div>`,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                  })}
                  zIndexOffset={600}
                />
              </>
            )}
          </Pane>
        </MapContainer>
      </div>

      {/* Bottom Controls - Simple and Clear */}
      <div className="controls-bottom">
        {!gameStarted && (
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px'}}>
            <AnimatedBorderTrail size="medium">
              <button className="btn-primary font-display" onClick={handleStartGame} style={{padding: '16px 48px', fontSize: '1.1rem', fontWeight: 700}}>
                <AnimatedGradientText className="text-xl">🎮 START GAME</AnimatedGradientText>
              </button>
            </AnimatedBorderTrail>
          </div>
        )}

        {gameStarted && !startStation && (
          <div className="destination-picker" style={{padding: '28px', maxWidth: '600px', margin: '0 auto'}}>
            <h3 className="font-display" style={{fontSize: '1.75rem', marginBottom: '24px', textAlign: 'center', fontWeight: 700, color: '#1e293b'}}>
              Select Your Starting Station
            </h3>
            <AnimatedBorderTrail size="medium" trailColor="from-primary-400 to-accent-500">
              <input
                type="text"
                placeholder="🔍 Search stations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-simple font-sans"
                style={{padding: '16px 20px', fontSize: '1.1rem', fontWeight: 500}}
                autoFocus
              />
            </AnimatedBorderTrail>
            <div className="search-results" style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {searchResults.map(stop => (
                <AnimatedBorderTrail key={stop.id} size="small" trailColor="from-accent-400 to-primary-400">
                  <div
                    className="search-result-item font-sans"
                    onClick={() => handleSelectStartStation(stop)}
                    style={{padding: '14px 20px', cursor: 'pointer', fontWeight: 500}}
                  >
                    <span className="stop-icon" style={{marginRight: '12px', fontSize: '1.4rem'}}>🚩</span>
                    <span className="stop-name" style={{fontSize: '1.05rem'}}>{stop.attributes.name}</span>
                  </div>
                </AnimatedBorderTrail>
              ))}
            </div>
          </div>
        )}

        {gameStarted && startStation && !destination && (
          <div className="destination-picker" style={{padding: '28px', maxWidth: '600px', margin: '0 auto'}}>
            <h3 className="font-display" style={{fontSize: '1.75rem', marginBottom: '24px', textAlign: 'center', fontWeight: 700, color: '#1e293b'}}>
              Select Your Destination
            </h3>
            <AnimatedBorderTrail size="medium" trailColor="from-primary-400 to-accent-500">
              <input
                type="text"
                placeholder="🔍 Search stations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-simple font-sans"
                style={{padding: '16px 20px', fontSize: '1.1rem', fontWeight: 500}}
                autoFocus
              />
            </AnimatedBorderTrail>
            <div className="search-results" style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {searchResults.map(stop => (
                <AnimatedBorderTrail key={stop.id} size="small" trailColor="from-accent-400 to-primary-400">
                  <div
                    className="search-result-item font-sans"
                    onClick={() => handleSelectDestination(stop)}
                    style={{padding: '14px 20px', cursor: 'pointer', fontWeight: 500}}
                  >
                    <span className="stop-icon" style={{marginRight: '12px', fontSize: '1.4rem'}}>🏁</span>
                    <span className="stop-name" style={{fontSize: '1.05rem'}}>{stop.attributes.name}</span>
                  </div>
                </AnimatedBorderTrail>
              ))}
            </div>
          </div>
        )}

        {gameStarted && startStation && destination && !gameWon && !isOnTrain && (
          <div className="game-info font-display" style={{padding: '20px', maxWidth: '700px', margin: '0 auto'}}>
            <AnimatedBorderTrail size="small" trailColor="from-pink-400 to-purple-500">
              <div style={{padding: '15px', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)', backdropFilter: 'blur(20px)', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(236, 72, 153, 0.2)'}}>
                <p style={{marginBottom: '8px'}}><strong className="font-game">Start:</strong> {startStation.attributes.name}</p>
                <p><strong className="font-game">Destination:</strong> {destination.attributes.name}</p>
                
                {/* Show transfer info if needed */}
                {waitingForTransfer && transferStation && (
                  <div style={{marginTop: '12px', padding: '10px', background: 'rgba(236, 72, 153, 0.2)', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)'}}>
                    <p style={{color: '#ec4899', fontWeight: 'bold', marginBottom: '6px'}}>🔄 TRANSFER REQUIRED</p>
                    <p style={{fontSize: '0.9rem'}}>Waiting at: <strong>{transferStation.attributes.name}</strong></p>
                    <p style={{fontSize: '0.9rem'}}>Next train: <strong style={{color: ROUTE_COLORS[currentRoute] || '#ec4899'}}>{currentRoute} Line</strong></p>
                  </div>
                )}
                
                {/* Show journey plan */}
                {journeyPlan.length > 1 && (
                  <div style={{marginTop: '12px', padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)'}}>
                    <p style={{fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: '#a855f7'}}>📍 JOURNEY PLAN:</p>
                    {journeyPlan.map((leg, idx) => (
                      <div key={idx} style={{
                        fontSize: '0.85rem',
                        marginBottom: '6px',
                        opacity: idx === currentLegIndex ? 1 : 0.6,
                        fontWeight: idx === currentLegIndex ? 'bold' : 'normal'
                      }}>
                        {idx === currentLegIndex && '▶ '}
                        <span style={{color: ROUTE_COLORS[leg.route] || '#ec4899'}}>{leg.route} Line</span>
                        {' → '}
                        {leg.to.attributes.name}
                        {leg.isTransfer && ' 🔄'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedBorderTrail>
            
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
                    <AnimatedBorderTrail size="medium">
                      <button 
                        className="btn-primary font-game" 
                        onClick={() => handleBoardTrain(train)}
                        style={{
                          padding: '15px 30px',
                          fontSize: '1.2em',
                          background: '#10b981',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          animation: 'pulse 1.5s infinite',
                          boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
                        }}
                      >
                        <AnimatedGradientText>🚺 BOARD</AnimatedGradientText>
                      </button>
                    </AnimatedBorderTrail>
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
          <div className="game-info font-display" style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
            <AnimatedBorderTrail size="medium" trailColor="from-pink-500 to-purple-600">
              <div style={{padding: '20px', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.25)'}}>
                <p style={{marginBottom: '10px', fontSize: '1.1rem'}}><strong className="font-game">Riding:</strong> {currentTrain?.routeId} Line 🚆</p>
                <p style={{marginBottom: '10px', fontSize: '1.1rem'}}>
                  <strong className="font-game">
                    {currentLegIndex < journeyPlan.length - 1 ? 'Next Stop' : 'Destination'}:
                  </strong> {journeyPlan[currentLegIndex]?.to?.attributes?.name || destination.attributes.name}
                </p>
                {currentLegIndex < journeyPlan.length - 1 && (
                  <p style={{marginBottom: '10px', fontSize: '0.95rem', color: '#ec4899', fontWeight: 'bold'}}>
                    🔄 Transfer required at next stop
                  </p>
                )}
                <p style={{fontSize: '1.1rem'}}><strong className="font-game">Journey:</strong> {distanceTraveled.toFixed(2)} miles traveled</p>
              </div>
            </AnimatedBorderTrail>
            
            {canOffboard && (
              <AnimatedBorderTrail size="large">
                <button 
                  className="btn-primary btn-large font-game" 
                  onClick={handleOffboard}
                  style={{marginTop: '15px', padding: '18px 40px', background: currentLegIndex < journeyPlan.length - 1 ? '#ec4899' : '#10b981', animation: 'pulse 2s infinite', fontSize: '1.3rem'}}
                >
                  <AnimatedGradientText>
                    {currentLegIndex < journeyPlan.length - 1 ? '🔄 TRANSFER HERE' : '🚺 OFF-BOARD (Arrived!)'}
                  </AnimatedGradientText>
                </button>
              </AnimatedBorderTrail>
            )}
            
            {!canOffboard && (
              <p className="font-display" style={{color: '#fbbf24', marginTop: '15px', textAlign: 'center', fontSize: '1.05rem'}}>
                🚆 Stay on train until you reach {journeyPlan[currentLegIndex]?.to?.attributes?.name || destination.attributes.name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(GameScreen);
