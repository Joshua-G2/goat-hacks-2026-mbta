# MBTA Transit Helper + RPG Game Mode with Solana Blockchain

A React web app that combines real-time MBTA trip planning with an optional RPG-style game layer. Use Transit Mode for route planning and live predictions, or switch to Game Mode for XP, quests, achievements, and event reporting.

**Key Features:**
- **Transit Mode** – Plan multi-leg MBTA trips in real time with:
  - Intelligent transfer routing: Origin → Transfer → Destination
  - Live arrival predictions and auto-refreshing data (every 30 seconds)
  - Walking time estimation and transfer confidence scoring based on timing and distance
  - Interactive map with MBTA line colors, routes, and station markers
  - Easy, validated station selection with dropdowns grouped by subway line

- **Game Mode** – Overlay an RPG system on top of everyday trips:
  - Unlock by uploading a ticket; earns points and tracks journeys
  - Progression via XP, levels, and achievements for distance and tasks
  - AI-generated “quests,” gamified event reporting, and a collection of badges

- **Blockchain Integration**:
  - Each journey and achievement is recorded on-chain (Solana, via Memo)
  - Micro-rewards (SOL) are distributed for validated journeys
  - Phantom or Solflare wallet connection for transparent, real-time rewards

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
