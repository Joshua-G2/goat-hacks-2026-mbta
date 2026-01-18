import { useState, useEffect, useRef } from 'react'
import './App.css'
import InteractiveMap, { LiveMapLegend } from './components/InteractiveMap'
import TransferGuidance from './components/TransferGuidance'
import LiveConnectionFinder from './components/LiveConnectionFinder'
import TripPlanner from './components/TripPlanner'
import UserProfile from './components/UserProfile'
import QuestDialog from './components/QuestDialog'
import EventReportOverlay from './components/EventReportOverlay'
import GameScreen from './components/GameScreen-SIMPLE';
import { generateQuest } from './services/questService'
import MBTA_API from './config/mbtaApi'
import { generateRandomTask, metersToMiles, checkMilestonReward, XP_REWARDS, createEventReport } from './utils/gameHelpers'
import { subscribeToUserLocations, subscribeToEvents, reportEvent } from './services/backendService'

/**
 * MBTA Real-Time Transfer Helper + RPG Game Mode
 * 
 * Main application component that coordinates all sub-components
 * 
 * Features:
 * - Standard Mode: Transit planning with real-time predictions
 * - Game Mode: RPG-style transit adventure with XP, quests, and social features
 * 
 * MBTA API Setup:
 * The MBTA API is configured in src/config/mbtaApi.js with the API key stored in .env
 * See API_SETUP.md for detailed setup instructions.
 */
function App() { //fallback list of stations for the app to use
  const IMPORTANT_STATIONS = [
    { id: 'place-alfcl', name: 'Alewife', latitude: 42.395428, longitude: -71.142483 },
    { id: 'place-brntn', name: 'Braintree', latitude: 42.207854, longitude: -71.001138 },
    { id: 'place-asmnl', name: 'Ashmont', latitude: 42.284652, longitude: -71.064489 },
    { id: 'place-forhl', name: 'Forest Hills', latitude: 42.300523, longitude: -71.113686 },
    { id: 'place-ogmnl', name: 'Oak Grove', latitude: 42.43668, longitude: -71.071097 },
    { id: 'place-wondl', name: 'Wonderland', latitude: 42.41342, longitude: -70.99167 },
    { id: 'place-bomnl', name: 'Bowdoin', latitude: 42.361365, longitude: -71.062037 },
    { id: 'place-river', name: 'Riverside', latitude: 42.337, longitude: -71.252 },
    { id: 'place-lech', name: 'Lechmere', latitude: 42.3703, longitude: -71.0765 },
    { id: 'place-sstat', name: 'South Station', latitude: 42.352271, longitude: -71.055242 },
    { id: 'place-gover', name: 'Government Center', latitude: 42.359705, longitude: -71.059215 }
  ];

  // Mode toggle - START IN TRANSIT MODE
  const [gameMode, setGameMode] = useState(false);
  
  // Transit mode state
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [selectedOriginId, setSelectedOriginId] = useState(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [suppressShake, setSuppressShake] = useState(false);
  const suppressShakeTimeoutRef = useRef(null);
  const [mapDebugEnabled, setMapDebugEnabled] = useState(false);
  const [legendVisibility, setLegendVisibility] = useState({
    user: true,
    origin: true,
    transfer: true,
    destination: true,
    vehicles: true,
  });

  // Game mode state
  const [xp, setXp] = useState(0);
  const [miles, setMiles] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [currentQuest, setCurrentQuest] = useState(null);
  const [showQuestDialog, setShowQuestDialog] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [nearbyTasks, setNearbyTasks] = useState([]);
  
  // Social features
  const [otherUsers, setOtherUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [userPosition, setUserPosition] = useState([42.3601, -71.0589]); // Boston default [lat, lng]
  const currentUserId = 'demo_user_' + Date.now(); // In production, get from auth

  // MBTA data
  const [stations, setStations] = useState([]);

  // Load MBTA stations on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await MBTA_API.getStops({ location_type: 1, route_type: '0,1' });
        const stationData = data.data.map(stop => ({
          id: stop.id,
          name: stop.attributes.name,
          latitude: stop.attributes.latitude,
          longitude: stop.attributes.longitude,
        }));
        setStations(stationData);
      } catch (err) {
        console.error('Error loading stations:', err);
      }
    };
    loadStations();
  }, []);

  // Generate initial tasks when entering game mode
  useEffect(() => {
    if (gameMode && tasks.length === 0 && stations.length > 0) {
      const initialTasks = Array.from({ length: 3 }, () => generateRandomTask(stations));
      setTasks(initialTasks);
    }
  }, [gameMode, stations]);

  // Pokémon GO-style: Spawn tasks near user location
  useEffect(() => {
    if (!gameMode || !userPosition || stations.length === 0) return;

    // Find nearby stations (within 500 meters ~ 0.3 miles)
    const nearby = stations.filter(station => {
      if (!station.latitude || !station.longitude) return false;
      
      const R = 6371e3;
      const φ1 = userPosition[0] * Math.PI / 180;
      const φ2 = station.latitude * Math.PI / 180;
      const Δφ = (station.latitude - userPosition[0]) * Math.PI / 180;
      const Δλ = (station.longitude - userPosition[1]) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= 500; // Within 500 meters
    });

    setNearbyTasks(nearby);

    // Spawn new tasks at nearby stations if needed
    if (tasks.length < 5 && nearby.length > 0 && Math.random() > 0.7) {
      const randomStation = nearby[Math.floor(Math.random() * nearby.length)];
      const newTask = generateRandomTask([randomStation]);
      if (!tasks.find(t => t.id === newTask.id)) {
        setTasks(prev => [...prev, newTask]);
      }
    }
  }, [gameMode, userPosition, stations, tasks.length]);

  // Subscribe to real-time updates (social features)
  useEffect(() => {
    if (!gameMode) return;

    const unsubscribeLocations = subscribeToUserLocations((locations) => {
      setOtherUsers(locations.filter(loc => loc.userId !== currentUserId));
    });

    const unsubscribeEvents = subscribeToEvents((newEvent) => {
      setEvents(prev => [...prev, newEvent]);
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e.id !== newEvent.id));
      }, newEvent.expiresAt - Date.now());
    });

    return () => {
      unsubscribeLocations();
      unsubscribeEvents();
    };
  }, [gameMode, currentUserId]);

  // Pokémon GO-style: Real-time GPS tracking with distance calculation
  useEffect(() => {
    if (!gameMode) return;

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = [
            position.coords.latitude, 
            position.coords.longitude
          ];
          
          // Calculate distance traveled
          if (lastPosition) {
            const R = 6371e3; // Earth radius in meters
            const φ1 = lastPosition[0] * Math.PI / 180;
            const φ2 = newPos[0] * Math.PI / 180;
            const Δφ = (newPos[0] - lastPosition[0]) * Math.PI / 180;
            const Δλ = (newPos[1] - lastPosition[1]) * Math.PI / 180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c; // Distance in meters
            
            const distanceInMiles = metersToMiles(distance);
            
            if (distanceInMiles > 0.001) { // Moved at least ~5 feet
              setMiles(prev => {
                const newMiles = prev + distanceInMiles;
                // Award XP for walking (like Pokémon GO)
                if (Math.floor(newMiles * 10) > Math.floor(prev * 10)) {
                  setXp(prevXp => prevXp + XP_REWARDS.mile);
                }
                return newMiles;
              });
            }
          }
          
          setUserPosition(newPos);
          setLastPosition(newPos);
        },
        (error) => {
          console.warn('GPS error:', error);
          setUserPosition([42.3601, -71.0589]);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [gameMode, lastPosition, miles]);

  // Check for milestone rewards when miles change
  useEffect(() => {
    const previousMiles = miles - 1; // Simplified
    const milestone = checkMilestonReward(miles, previousMiles);
    if (milestone) {
      alert(`🎉 Achievement Unlocked: ${milestone.reward} ${milestone.badge}`);
    }
  }, [miles]);

  const selectedStops = {
    origin: selectedOrigin,
    transfer: selectedTransfer,
    destination: selectedDestination,
  };

  useEffect(() => {
    setSelectedOriginId(selectedOrigin?.id || null);
  }, [selectedOrigin]);

  useEffect(() => {
    setSelectedDestinationId(selectedDestination?.id || null);
  }, [selectedDestination]);

  const handleDataUpdated = () => {
    setLastUpdatedAt(new Date());
  };

  const handleModeToggle = () => {
    setSuppressShake(true);
    if (suppressShakeTimeoutRef.current) {
      clearTimeout(suppressShakeTimeoutRef.current);
    }
    setGameMode(prev => !prev);
    setShowDecisionEngine(false); // Hide decision engine when switching modes
    suppressShakeTimeoutRef.current = setTimeout(() => {
      setSuppressShake(false);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (suppressShakeTimeoutRef.current) {
        clearTimeout(suppressShakeTimeoutRef.current);
      }
    };
  }, []);

  const handleCompleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setXp(prevXp => prevXp + XP_REWARDS.TASK_COMPLETE);
    setTasksCompleted(prev => prev + 1);
    
    // Generate new task nearby (Pokémon GO style - spawn near player)
    if (nearbyTasks.length > 0) {
      const randomStation = nearbyTasks[Math.floor(Math.random() * nearbyTasks.length)];
      const newTask = generateRandomTask([randomStation]);
      setTasks(prev => [...prev, newTask]);
    } else if (stations.length > 0) {
      const newTask = generateRandomTask(stations);
      setTasks(prev => [...prev, newTask]);
    }
  };

  const handleTravel = (distanceMiles) => {
    setMiles(prev => prev + distanceMiles);
    setXp(prevXp => prevXp + Math.floor(distanceMiles * XP_REWARDS.MILE_TRAVELED));
  };

  const handleReportEvent = async (eventType, location) => {
    const event = createEventReport(eventType, location, currentUserId);
    await reportEvent(event);
    setXp(prevXp => prevXp + XP_REWARDS.EVENT_REPORT);
  };

  const handleGenerateQuest = async (stationId) => {
    const station = stations.find(s => s.id === stationId);
    const quest = await generateQuest(stationId, currentUserId, { stationName: station?.name });
    setCurrentQuest(quest);
    setShowQuestDialog(true);
  };

  const handleAcceptQuest = () => {
    if (currentQuest) {
      setTasks(prev => [...prev, currentQuest]);
    }
    setShowQuestDialog(false);
    setCurrentQuest(null);
  };

  return (
    <div className={`app ${gameMode ? 'game-mode-active' : ''}`}>
      {!gameMode && (
        <header className="app-header">
          <h1>🚇 MBTA Transit Helper</h1>
          <p className="app-description">
            Plan your journey with live predictions and transfer guidance
          </p>
          <button 
            className="mode-toggle-button"
            onClick={handleModeToggle}
          >
            🎮 Enter Game Mode
          </button>
        </header>
      )}

      {gameMode && (
         <div className="game-mode-toggle-float" onClick={handleModeToggle}>
            ❌ Exit Game
         </div>
      )}

      <div className="app-container">
        {/* Left Column - Hidden in Game Mode */}
        {!gameMode && (
        <aside className="app-sidebar">
             <TripPlanner
                  fallbackStations={IMPORTANT_STATIONS}
                  selectedOrigin={selectedOrigin}
                  selectedDestination={selectedDestination}
                  selectedTransfer={selectedTransfer}
                  onOriginChange={setSelectedOrigin}
                  onDestinationChange={setSelectedDestination}
                  onTransferChange={setSelectedTransfer}
                />
                
                <TransferGuidance 
                  selectedOrigin={selectedOrigin}
                  selectedDestination={selectedDestination}
                  transferStation={selectedStops.transfer}
                  walkingSpeed="normal"
                />
          </aside>
        )}

          {/* Right Column: Shared Map */}
          <main className={`app-main ${gameMode ? 'full-screen-game' : ''}`}>
            {gameMode ? (
              <>
                <GameScreen />
                <EventReportOverlay
                  userLocation={userPosition}
                  onReportEvent={handleReportEvent}
                />
              </>
            ) : (
              <>
                <div className="map-stack">
                  <InteractiveMap 
                    selectedStops={selectedStops}
                    onDataUpdated={handleDataUpdated}
                    legendVisibility={legendVisibility}
                    onLegendVisibilityChange={setLegendVisibility}
                    showLegend={!gameMode}
                    debugEnabled={mapDebugEnabled}
                    onDebugEnabledChange={setMapDebugEnabled}
                  />
                </div>

                <LiveConnectionFinder
                  selectedOrigin={selectedOrigin}
                  selectedTransfer={selectedTransfer}
                  selectedDestination={selectedDestination}
                  selectedOriginId={selectedOriginId}
                  selectedDestinationId={selectedDestinationId}
                  lastUpdatedAt={lastUpdatedAt}
                  onDataUpdated={handleDataUpdated}
                />
              </>
            )}
          </main>
      </div>

      {/* Quest Dialog */}
      {showQuestDialog && currentQuest && (
        <QuestDialog
          quest={currentQuest}
          onAccept={handleAcceptQuest}
          onDecline={() => setShowQuestDialog(false)}
          onClose={() => setShowQuestDialog(false)}
        />
      )}

      <footer className="app-footer">
        <p>
          Data provided by <a href="https://www.mbta.com/" target="_blank" rel="noopener noreferrer">MBTA</a>
          {' '} | {' '}
          Built for Goat Hacks 2026
          {gameMode && (
            <span> | 👥 {otherUsers.length} players online | ⭐ {xp} XP | 🚇 {miles.toFixed(1)} mi</span>
          )}
          {' '} | {' '}
          <label className="footer-toggle">
            <input
              type="checkbox"
              checked={mapDebugEnabled}
              onChange={(event) => setMapDebugEnabled(event.target.checked)}
            />
            Show Map Coordinates
          </label>
        </p>
      </footer>
    </div>
  )
}

export default App
