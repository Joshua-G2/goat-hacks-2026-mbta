# MBTA RPG Mobile App

React Native mobile app for MBTA transit gamification - Pokémon GO meets Waze.

## 📦 Installation

```bash
cd mobile
npm install
```

## 🚀 Running the App

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## 🔑 API Configuration

The app uses the MBTA V3 API. API key is already configured in `.env`:

```
MBTA_API_KEY=e6d82008f5c44c6c9906ca613361e366
MBTA_API_BASE_URL=https://api-v3.mbta.com
```

For Google Maps on Android, add your API key to `app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── api/              # MBTA API client with retry logic
│   │   └── mbta.ts       # Exponential backoff, caching
│   ├── hooks/            # Custom React hooks
│   │   ├── useLocation.ts     # GPS tracking with watchPosition
│   │   └── useMBTAData.ts     # MBTA data polling (5-10s)
│   ├── screens/          # App screens
│   │   └── MapScreen.tsx      # Main map with routes/stops/vehicles
│   ├── components/       # Reusable components
│   ├── store/            # Zustand global state
│   │   ├── locationStore.ts   # GPS state
│   │   ├── mbtaStore.ts       # MBTA data state
│   │   └── gameStore.ts       # Game state (XP, quests, tasks)
│   ├── types/            # TypeScript definitions
│   │   └── index.ts      # MBTA API types, game types
│   └── utils/            # Utility functions
│       ├── config.ts     # Environment config
│       └── helpers.ts    # Distance calc, polyline decode
├── App.tsx               # Entry point
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## 🎯 Features

### Core Functionality
- **Real-time GPS tracking**: Uses `expo-location` with `watchPositionAsync`
- **MBTA API integration**: Fetches routes, stops, predictions, vehicles, alerts
- **Smart polling**: 
  - Routes/stops/shapes: cached (fetch once)
  - Predictions/vehicles: poll every 8 seconds
- **Error handling**: Exponential backoff with retry (3 attempts, 1s→2s→4s delays)
- **TypeScript**: Full type safety across entire app

### Map Features
- User location marker (blue pin)
- MBTA stops (orange pins)
- Live vehicles (green pins)
- Route polylines (color-coded by line)
- Real-time status bar showing route/stop/vehicle counts

### State Management (Zustand)
- `locationStore`: GPS coordinates, tracking status
- `mbtaStore`: Routes, stops, predictions, vehicles, alerts
- `gameStore`: User profile, XP, quests, tasks, achievements

## 🔧 Technical Implementation

### API Client (`src/api/mbta.ts`)
- Axios instance with base URL and API key headers
- Retry logic for 5xx errors and network failures
- Response caching (5-minute TTL for static data)
- Methods: `getRoutes()`, `getStops()`, `getPredictions()`, `getVehicles()`, `getShapes()`, `getAlerts()`

### GPS Tracking (`src/hooks/useLocation.ts`)
- Requests foreground location permissions
- Updates every 5 seconds or 10 meters moved
- Calculates distance to targets using Haversine formula
- Auto-starts on mount, cleanup on unmount

### Data Polling (`src/hooks/useMBTAData.ts`)
- Fetches static data (routes/stops) once on mount
- Polls predictions/vehicles/alerts every 8 seconds
- Filters by user location radius (~1km)
- Resilient to temporary failures (keeps polling)

## 📱 Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 🚀 Deployment

### iOS
1. Configure bundle ID in `app.json`
2. Run `eas build --platform ios`
3. Submit to App Store with `eas submit --platform ios`

### Android
1. Configure bundle ID in `app.json`
2. Add Google Maps API key
3. Run `eas build --platform android`
4. Submit to Play Store with `eas submit --platform android`

## 🎮 Game Mechanics (Upcoming)

- **Proximity spawning**: Tasks appear within 500m of user
- **RAG-enhanced quests**: AI generates quests based on time, weather, alerts, user level
- **XP & leveling**: Earn XP for trips, level up to unlock features
- **Social features**: Multiplayer events, leaderboards
- **Achievements**: Badges for milestones

## 🐛 Debugging

### Check MBTA API
```bash
curl -H "x-api-key: e6d82008f5c44c6c9906ca613361e366" \
  https://api-v3.mbta.com/routes
```

### View Logs
- App logs routes fetched on boot
- Check console for GPS tracking status
- Real-time data updates logged every 8 seconds

## 📄 License

MIT
