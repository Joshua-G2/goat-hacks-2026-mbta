# MBTA Transit Helper + RPG Mode

A React web app that combines real-time MBTA trip planning with an optional RPG-style game layer. Use Transit Mode for route planning and live predictions, or switch to Game Mode for XP, quests, achievements, and event reporting.

## Modes

### Transit Mode
- Trip planning with origin, transfer, and destination selection
- Live predictions and transfer confidence
- Interactive map with routes, stops, and selection overlays
- Transfer guidance with walking time and accessibility notes
- Live connection finder with countdowns

### Game Mode
- XP and level system with titles and progress
- Tasks and quests generated around MBTA stations
- Achievements and milestone rewards
- Social event reporting and activity feed

## Quick Start

See `QUICKSTART.md` for a short setup guide.

### Prerequisites
- Node.js 18+
- MBTA API key (https://api-v3.mbta.com/register)

### Install and Run
```bash
npm install
cp .env.example .env
# Add VITE_MBTA_API_KEY to .env
npm run dev
```
Open http://localhost:5173

## Documentation
- `QUICKSTART.md` - setup steps
- `API_SETUP.md` - MBTA API configuration
- `RPG_FEATURES.md` - RPG mode details
- `IMPLEMENTATION_SUMMARY.md` - implementation notes

## Project Structure
```
src/
├── components/
│   ├── TripPlanner.jsx
│   ├── InteractiveMap.jsx
│   ├── TransferGuidance.jsx
│   ├── LiveConnectionFinder.jsx
│   ├── GameMap.jsx
│   ├── UserProfile.jsx
│   └── QuestDialog.jsx
├── config/
│   └── mbtaApi.js
├── services/
│   ├── backendService.js
│   ├── questService.js
│   └── mbtaService.ts
├── utils/
│   ├── transitHelpers.js
│   └── gameHelpers.js
└── App.jsx
```

## Tech Stack
- React 19
- Vite
- MBTA V3 API
- Leaflet + React Leaflet
- CSS modules by component

## Scripts
```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## MBTA API
The API client lives in `src/config/mbtaApi.js`. It wraps the MBTA V3 endpoints used for routes, stops, predictions, vehicles, alerts, and schedules. See `API_SETUP.md` for configuration and `.env.example` for required env vars.

## Optional Services
- Firebase or Supabase for persistence and multiplayer
- LLM tooling for quest text generation
- TTS providers for narration

## Mobile App
The `mobile/` directory contains a React Native app using shared MBTA concepts with native mapping and game systems. See `mobile/README.md` for setup.
