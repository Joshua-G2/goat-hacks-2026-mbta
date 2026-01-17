# MBTA RPG Mobile App - Architecture Documentation

## Overview
This is a real-time, location-based transit gamification app combining Pokémon GO mechanics with Waze-style navigation. Built with React Native, Expo, TypeScript, and Zustand.

## State Architecture

### Global State (Zustand Stores)

#### 1. Location Store (`src/store/locationStore.ts`)
```typescript
{
  userLocation: Location | null;
  watchId: number | null;
  isTracking: boolean;
  error: string | null;
}
```

**Responsibilities:**
- GPS tracking state
- Current user coordinates
- Location permissions status

**Update Frequency:** Every 5 seconds or 10 meters (via `watchPositionAsync`)

---

#### 2. MBTA Store (`src/store/mbtaStore.ts`)
```typescript
{
  routes: MBTARoute[];
  stops: MBTAStop[];
  predictions: MBTAPrediction[];
  vehicles: MBTAVehicle[];
  alerts: MBTAAlert[];
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
}
```

**Responsibilities:**
- MBTA API data cache
- Real-time transit information
- Network state

**Update Frequency:**
- Routes/Stops: Fetched once, cached (5 min TTL)
- Predictions/Vehicles/Alerts: Polled every 8 seconds

---

#### 3. Game Store (`src/store/gameStore.ts`)
```typescript
{
  profile: UserProfile;
  tasks: Task[];
  quests: Quest[];
  events: GameEvent[];
}
```

**Responsibilities:**
- User XP and level (12 levels)
- Active game tasks
- Quest progression
- Achievement tracking

**Update Frequency:** On-demand (task completion, XP gain, etc.)

---

## Data Flow

### 1. GPS Tracking Flow
```
expo-location (watchPositionAsync)
  ↓
useLiveLocation hook (anti-jitter filter)
  ↓
locationStore.setUserLocation()
  ↓
PlayerCarMarker (UI update)
  ↓
Task auto-completion (proximity checks)
```

**Anti-Jitter Filter:**
- Ignores jumps >250m within 2 seconds unless accuracy is poor
- Maintains moving average of accuracy (10 samples)
- Validates coordinates: -90≤lat≤90, -180≤lng≤180

---

### 2. MBTA Data Polling Flow
```
useLiveMbta hook (interval-based)
  ↓
mbtaClient API calls (with retry logic)
  ↓
mbtaStore.set[Routes|Stops|Predictions|Vehicles|Alerts]()
  ↓
MapGameScreen (render vehicles/stops)
  ↓
Task completion (vehicle proximity + predictions)
```

**Polling Strategy:**
- Static data (routes/stops): Fetch once, cache with 5-min TTL
- Real-time data (predictions/vehicles): Poll every 8s
- On failure: Backoff to 15s, auto-recover to 8s on success

---

### 3. Trip Planning Flow
```
User selects destination
  ↓
tripPlanner.planTrip() (find routes, transfers)
  ↓
Update tripPlan in app state
  ↓
useLiveMbta starts polling (routeIds from plan)
  ↓
taskGenerator.generateTasks() (walk, board, ride, transfer)
  ↓
gameStore.setTasks() (with geoFences)
  ↓
Auto-completion checks every 3s (supervisor)
```

**Trip Planning Algorithm:**
1. Find nearest stop to user (distance calc)
2. Get routes for start and destination stops
3. Find common routes (direct trip)
4. If no direct route, find 1-transfer via shared stop (<500m)
5. Fallback: Return best-effort direct route with warning

---

### 4. Task Auto-Completion Flow
```
Supervisor loop (every 3s)
  ↓
taskGenerator.autoCheckTasks()
  ↓
Check each task type:
  - walk-to-stop: distance ≤ 100m
  - board: vehicle ≤150m AND departure ≤2min
  - ride: distance ≤ 100m (destination)
  - transfer: distance ≤ 100m
  ↓
gameStore.addXP() (on completion)
  ↓
Level up event (if XP threshold crossed)
```

**XP Rewards:**
- Walk to stop: 10 XP
- Board train: 20 XP
- Ride to destination: 30 XP
- Complete transfer: 50 XP

**Leveling:** `level = floor(xp / 1000) + 1` (max 12 levels)

---

## Polling Intervals & Constants

### GPS
```typescript
const GPS_MIN_MS = 5000;              // Update every 5 seconds
const GPS_MIN_DISTANCE_M = 10;        // Or when moved 10 meters
const MAX_JUMP_DISTANCE_M = 250;      // Anti-jitter threshold
const MIN_JUMP_INTERVAL_MS = 2000;    // Jump detection window
const POOR_ACCURACY_THRESHOLD = 50;   // meters
const ACCURACY_SAMPLES = 10;          // Moving average window
```

### MBTA Polling
```typescript
const MBTA_POLL_MS = 8000;            // Poll every 8 seconds
const BACKOFF_POLL_MS = 15000;        // Backoff on failure
const EMPTY_VEHICLE_THRESHOLD = 3;    // Warn after 3 empty cycles
const STALE_PREDICTION_MS = 120000;   // 2 minutes
```

### Trip Planning
```typescript
const BOUNDING_BOX_KM = 2;            // Search radius for stops
const MAX_TRANSFER_DISTANCE_M = 500;  // Max walk distance
```

### Transfer Confidence
```typescript
const TRANSFER_BUFFER_SEC = 120;      // 2 minutes safety buffer
const WALK_SPEED_MPS = 1.4;           // 1.4 m/s walking speed
const LIKELY_THRESHOLD_SEC = 240;     // ≥4 min margin → Likely
const RISKY_THRESHOLD_SEC = 60;       // 1-4 min margin → Risky
                                       // <1 min margin → Unlikely
```

### Game Tasks
```typescript
const STOP_RADIUS_M = 100;            // GeoFence for stops
const VEHICLE_RADIUS_M = 150;         // Boarding proximity
const DEPARTURE_WINDOW_SEC = 120;     // Must depart within 2 min
```

### Supervisor
```typescript
const GPS_STALE_THRESHOLD_MS = 10000;    // 10s → restart GPS
const MBTA_STALE_THRESHOLD_MS = 20000;   // 20s → refresh MBTA
const SUPERVISOR_INTERVAL_MS = 3000;     // Run every 3s
const MAX_LOG_ENTRIES = 50;              // Diagnostic history
const MAX_AUTO_FIX_HISTORY = 20;         // Auto-fix history
```

### API Retry
```typescript
const MAX_RETRY = 3;                  // Retry 3 times
const BASE_DELAY_MS = 1000;           // 1s → 2s → 4s backoff
```

---

## Error Recovery Strategies

### 1. GPS Issues
**Symptoms:** `isTracking=false`, invalid coords, stale data (>10s)
**Auto-correction:** Restart `watchPositionAsync`
**Fallback:** Dev mode allows manual location tap

### 2. MBTA Polling Failures
**Symptoms:** Consecutive API failures, stale data (>20s)
**Auto-correction:**
1. Immediate refresh attempt
2. Backoff to 15s polling
3. Auto-recover to 8s on success

### 3. Invalid Trip Plan
**Symptoms:** Empty legs, missing route/stop IDs
**Auto-correction:** Regenerate plan with last known destination
**Fallback:** Best-effort direct route with warning

### 4. Desynced Tasks
**Symptoms:** Tasks exist without trip plan, or vice versa
**Auto-correction:** Regenerate tasks, preserve completed status

---

## Validation Rules

### Coordinates
```typescript
validateLatLng(lat, lng):
  - Must be numbers (not NaN)
  - -90 ≤ lat ≤ 90
  - -180 ≤ lng ≤ 180
```

### Timestamps
```typescript
validateIsoTime(time):
  - Must be valid ISO 8601 string
  - new Date(time) must not be NaN
```

### IDs
```typescript
validateId(id):
  - Must be non-empty string
  - Length < 256 characters
```

### Tasks
```typescript
validateTask(task):
  - Must have id, type
  - stopId/routeId must pass validateId
  - geoFence must have valid lat/lng
  - radiusMeters > 0
```

---

## Type System Guarantees

### Never Types
Used to catch unhandled cases at compile-time:

```typescript
// Task type exhaustiveness
type TaskType = 'walk-to-stop' | 'board' | 'ride' | 'transfer';

function handleTask(type: TaskType) {
  switch(type) {
    case 'walk-to-stop': return ...;
    case 'board': return ...;
    case 'ride': return ...;
    case 'transfer': return ...;
    default:
      const _exhaustive: never = type;
      throw new Error(`Unhandled task type: ${_exhaustive}`);
  }
}
```

### Strict Mode
All TypeScript files use strict mode:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

---

## Supervisor Health Checks

Run every 3 seconds, auto-corrects issues:

| Check | Validation | Auto-Fix |
|-------|-----------|----------|
| GPS Active | `isTracking === true` | Restart GPS |
| GPS Valid | Coords in range, not NaN | Restart GPS |
| GPS Fresh | Last update < 10s | Restart GPS |
| MBTA Polling | Last update < 20s (when trip active) | Trigger refresh |
| Trip Plan Valid | Legs non-empty, IDs present | Regenerate plan |
| Tasks Synced | Tasks exist for trip plan | Regenerate tasks |

**Observability:**
- Structured logs: `errors[]`, `warnings[]`, `lastAutoFix[]`
- Debug drawer UI (5 taps to reveal)
- Console logging with categories

---

## Directory Structure

```
mobile/
├── src/
│   ├── api/
│   │   ├── mbta.ts              # Old API client (deprecated)
│   │   └── mbtaClient.ts        # New self-healing API client
│   ├── hooks/
│   │   ├── useLocation.ts       # Old GPS hook (deprecated)
│   │   ├── useLiveLocation.ts   # New GPS with anti-jitter
│   │   ├── useMBTAData.ts       # Old polling hook
│   │   └── useLiveMbta.ts       # New smart polling
│   ├── screens/
│   │   ├── MapScreen.tsx        # Old map screen
│   │   └── MapGameScreen.tsx    # New Pokemon-Go style screen
│   ├── components/
│   │   └── PlayerCarMarker.tsx  # User location marker
│   ├── store/
│   │   ├── locationStore.ts     # GPS state
│   │   ├── mbtaStore.ts         # Transit data state
│   │   └── gameStore.ts         # Game progression state
│   ├── services/
│   │   ├── tripPlanner.ts       # Route planning
│   │   ├── transferConfidence.ts # Badge calculation
│   │   ├── taskGenerator.ts     # Game tasks
│   │   └── supervisor.ts        # Health monitoring
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   └── utils/
│       ├── config.ts            # ENV loader
│       └── helpers.ts           # Distance calc, polyline decode
├── App.tsx                      # Entry point
├── app.json                     # Expo config
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript config
```

---

## Performance Considerations

### Memory Management
- Max log entries: 50 errors + 50 warnings
- Max auto-fix history: 20 entries
- MBTA cache TTL: 5 minutes
- Location history: None (only current position)

### Network Optimization
- Routes/stops: Fetch once, cache locally
- Predictions/vehicles: Poll only when trip active
- Exponential backoff on failures
- Request deduplication in progress

### Battery Optimization
- GPS updates: Max 5s interval (not continuous)
- Distance threshold: 10m (avoid trivial updates)
- Background polling: Disabled (foreground only)

---

## Security

### API Key
- Stored in `.env` (not committed)
- Accessed via `Constants.expoConfig.extra`
- Falls back to unauthenticated requests with warning

### Permissions
- Location: Foreground only (not background)
- iOS: `NSLocationWhenInUseUsageDescription`
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`

---

## Testing Strategy

### Runtime Contracts
`assertContracts()` runs on app start, validates:
1. All store slices exist and have required methods
2. All constants are defined and in valid ranges
3. Environment variables are loaded
4. TypeScript strict mode is enabled

### Manual Testing
- GPS: Walk around, check marker updates
- MBTA: Verify vehicles/predictions refresh
- Trip Planning: Test direct routes and transfers
- Tasks: Verify auto-completion near stops
- Supervisor: Disconnect network, watch auto-recovery

---

## Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Blank screen | Map not rendering | Check location permissions |
| No vehicles | Empty vehicle list | Normal during off-peak hours |
| Stale predictions | Times don't update | Supervisor auto-refreshes after 20s |
| GPS jumps | Marker teleports | Anti-jitter filter prevents >250m jumps |
| Tasks not completing | Near stop but not triggered | Check radius (100m default) |
| Network errors | API failures | Exponential backoff + auto-retry |

---

## Future Enhancements

1. **Offline Mode:** Cache route shapes, work without network
2. **Push Notifications:** Alert for departures, transfers
3. **Social Features:** Multiplayer events, leaderboards
4. **AR Mode:** Point camera at stops for info overlay
5. **Scheduled Times Fallback:** Use /schedules when predictions unavailable
6. **Analytics:** Track completion rates, popular routes
7. **Accessibility:** VoiceOver support, high contrast mode

---

## Change Log

- **v1.0:** Initial web app with Leaflet maps
- **v1.1:** React Native migration with Expo
- **v1.2:** Added self-healing API client
- **v1.3:** Implemented supervisor loop
- **v1.4:** Added transfer confidence badges
- **v1.5:** Game tasks with auto-completion

---

## License
MIT
