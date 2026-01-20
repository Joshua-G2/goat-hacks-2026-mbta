# MBTA Transit Helper + RPG Game Mode 🚇🎮

A dual-mode React application combining **practical real-time MBTA transit planning** with an **engaging blockchain-powered RPG game** that gamifies your daily commute and incentivizes fare compliance.

---

## 🌟 Two Modes, One Purpose

### 🗺️ **Transit Mode** - Smart Journey Planning
Real-time MBTA trip planning with intelligent transfer guidance and live predictions.

### 🎮 **Game Mode** - Blockchain-Verified Adventures
Transform your commute into an RPG quest! Upload tickets, explore Boston's transit network, earn points, and receive blockchain-verified rewards on Solana.

---

## 🎯 Features

### 🗺️ Transit Mode - Real-Time Journey Planning

#### **1. Smart Trip Planner**
Plan multi-leg journeys with live MBTA data and intelligent routing.

**Core Features:**
- **Origin → Transfer → Destination** route selection
- **Real-time arrival predictions** from MBTA V3 API
- **Auto-refresh** every 30 seconds for live updates
- **Walking time estimation** with adjustable speed (3-5 mph)
- **Transfer confidence calculator** using timing analysis

**Transfer Confidence Algorithm:**
The system calculates transfer success probability based on:
- Time buffer between arrivals and departures
- Walking distance between platforms (Haversine formula)
- Historical MBTA delay patterns

Results:
- **Likely** ✅ (>5 min buffer) - Safe transfer
- **Risky** ⚠️ (2-5 min buffer) - Possible but tight
- **Unlikely** ❌ (<2 min buffer) - High risk of missing connection

#### **2. Live Connection Finder**
Real-time prediction display with smart filtering:
- Shows next 3-5 arrivals per route
- Color-coded by MBTA line (Red, Orange, Blue, Green)
- Countdown timers in minutes
- Platform/track information
- Alerts and service disruptions

#### **3. Interactive Map**
Leaflet-powered map visualization:
- Official MBTA route colors (Red: `#DA291C`, Orange: `#ED8B00`, etc.)
- Station markers for origin, transfer, and destination
- Route polylines with real MBTA shapes
- Toggle layers for different line visibility
- User location tracking

#### **4. Station Selection**
Intuitive dropdowns with:
- 100+ MBTA stations searchable by name
- Grouped by subway line
- Real-time data fetching on selection
- Validation to prevent invalid routes

---

### 🎮 Game Mode - RPG Transit Adventure + Blockchain

#### **Core Gameplay**
Turn your MBTA commute into an epic quest system:

**Ticket Upload Requirement:**
- Upload transit ticket to unlock game mode
- **Incentivizes fare compliance** - players must pay to play
- Foundation for future automated ticket verification

**Journey Mechanics:**
1. Select start and end stations
2. Navigate through actual MBTA routes in real-time
3. Reach transfer stations and final destinations
4. Earn points based on distance traveled
5. Complete journeys to trigger blockchain rewards

**XP & Progression:**
- Points earned: `distance × 100 points per mile`
- Distance tracking: Real GPS or manual station-to-station progression
- Level up by completing more complex routes
- Explore all MBTA lines to maximize rewards

#### **🔗 Solana Blockchain Integration**

**Real On-Chain Recording:**
- Each completed journey creates a **verifiable blockchain transaction**
- Data stored on Solana via Memo program (immutable record)
- Transaction signatures provide proof of journey completion

**Reward System:**
- **0.001 SOL per point earned** (configurable)
- Micro-rewards distributed automatically
- Requires Phantom wallet connection
- Two transactions per journey:
  1. Journey data recording (Memo program)
  2. Reward memo (points → SOL conversion)

**Transaction History:**
- Real-time panel showing recent blockchain transactions
- Direct links to Solana Explorer for verification
- Displays: route, points earned, SOL received, timestamp

**Wallet Integration:**
- Phantom/Solflare wallet support
- DevNet for testing, MainNet-ready architecture
- Auto-connect on app load
- Balance display with manual refresh

#### **Social Impact: Gamified Fare Compliance**

**The Problem:**
- Fare evasion costs US transit agencies **$500M+ annually**
- Traditional enforcement is punitive and ineffective

**Our Solution:**
- **Upload ticket → Play game → Earn crypto rewards**
- Positive incentive structure vs. punishment
- Makes paying for transit **rewarding and fun**
- Scalable to any transit system worldwide

**Why It Works:**
- Small crypto rewards (≈$0.10) are sufficient when gamified
- Blockchain verification prevents fraud
- Social proof via on-chain achievements
- Builds community of compliant, engaged riders

## 🚀 Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for 5-minute setup guide.

### Prerequisites

- Node.js 18+ and npm
- MBTA API key (free at https://api-v3.mbta.com/register)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your MBTA API key to .env
# VITE_MBTA_API_KEY=your_key_here

# Start development server
npm run dev
```

Open http://localhost:5173

### Mode Toggle

Click **"Switch to Game Mode"** in the header to activate RPG features!

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[RPG_FEATURES.md](RPG_FEATURES.md)** - Complete RPG implementation guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What was built
- **[API_SETUP.md](API_SETUP.md)** - MBTA API configuration details

## 🎮 How to Play (Game Mode)

1. **Switch to Game Mode** - Click the toggle button
2. **Complete Tasks** - Visit stations and click ✓ to earn +5 XP
3. **Travel Miles** - Track your transit journeys for +1 XP per mile
4. **Report Events** - Help the community by reporting delays, police, etc.
5. **Generate Quests** - Click "Generate New Quest" for AI narratives
6. **Level Up** - Progress through 12 unique titles
7. **Unlock Achievements** - Reach mileage milestones
8. **Earn Free Ticket** - Hit 100,000 miles for your reward!

## 🏗️ Project Structure

```
src/
├── components/
│   ├── TripPlanner.jsx          # Smart trip planning ⭐ NEW
│   ├── GameMap.jsx               # RPG map view ⭐ NEW
│   ├── UserProfile.jsx           # Levels & achievements ⭐ NEW
│   ├── QuestDialog.jsx           # AI quests ⭐ NEW
│   ├── InteractiveMap.jsx        # Transit map
│   ├── StationSelector.jsx       # Station selection
│   ├── TransferGuidance.jsx      # Transfer help
│   ├── LiveConnectionFinder.jsx  # Real-time trains
│   └── ConfidenceIndicator.jsx   # Transfer confidence
├── utils/
│   ├── transitHelpers.js         # Transit calculations ⭐ NEW
│   └── gameHelpers.js            # Game mechanics ⭐ NEW
├── services/
│   └── backendService.js         # Backend layer ⭐ NEW
├── config/
│   └── mbtaApi.js               # MBTA API wrapper
├── App.jsx                       # Main app with mode toggle
└── main.jsx                      # Entry point
```

## 🔧 Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool & dev server
- **MBTA V3 API** - Real-time transit data
- **CSS3** - Styling with animations

### Optional Integrations

- **Firebase** - Real-time multiplayer backend
- **Supabase** - PostgreSQL-based backend
- **Leaflet/Mapbox** - Interactive maps
- **LlamaIndex** - RAG for quest generation
- **OpenRouter** - LLM API for narratives
- **ElevenLabs** - Text-to-speech for quests

## 🎯 XP & Rewards

### How to Earn XP

- ⭐ Complete task: **+5 XP**
- 🚇 Travel 1 mile: **+1 XP**
- 📍 Visit station: **+2 XP**
- 🔄 Successful transfer: **+3 XP**
- 🎯 Complete route: **+10 XP**
- 📅 Daily login: **+5 XP**
- 📢 Report event: **+2 XP**

### Achievements

| Miles | Reward | Badge |
|-------|--------|-------|
| 100 | First 100 Miles | 🎯 |
| 500 | Transit Regular | 🚇 |
| 1,000 | Thousand Mile Club | ⭐ |
| 5,000 | Master Navigator | 🏆 |
| 10,000 | Transit Legend | 👑 |
| 50,000 | Epic Commuter | 💎 |
| 100,000 | **FREE TICKET!** | 🎁 |

## 🔌 Backend Setup (Optional)

The app works immediately with a mock backend. For multiplayer and persistence:

### Firebase

```bash
npm install firebase
```

1. Create Firebase project
2. Enable Firestore
3. Add config to `.env`
4. Uncomment Firebase code in `src/services/backendService.js`

### Supabase

```bash
npm install @supabase/supabase-js
```

1. Create Supabase project
2. Run SQL schema (see RPG_FEATURES.md)
3. Add config to `.env`
4. Uncomment Supabase code in `src/services/backendService.js`

See **[RPG_FEATURES.md](RPG_FEATURES.md)** for detailed backend setup.

## 🤖 AI Quest Generation

To enable dynamic AI-generated quests:

1. Set up backend API endpoint
2. Integrate LlamaIndex for RAG
3. Connect OpenRouter for LLM
4. Add ElevenLabs for TTS

See **[RPG_FEATURES.md](RPG_FEATURES.md)** for complete integration guide.

## 📋 Available Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## 🌐 MBTA API

### Endpoints Used

- `/routes` - Get all MBTA routes
- `/stops` - Get stops for routes
- `/predictions` - Real-time arrival/departure predictions
- `/schedules` - Scheduled times (fallback)
- `/vehicles` - Live vehicle positions
- `/alerts` - Service alerts

**Rate Limit**: 1000 requests/minute  
**Documentation**: https://api-v3.mbta.com/docs/swagger/index.html
- **Configuration**: See `.env.example` for template
- **Helper Module**: `src/config/mbtaApi.js`
- **Setup Guide**: `API_SETUP.md`

#### Using the API in Components

```javascript
// Import the MBTA API helper
import MBTA_API from '../config/mbtaApi';

// Fetch routes
const routesData = await MBTA_API.getRoutes({ type: '0,1' });

// Fetch stops for a route
const stopsData = await MBTA_API.getStops({ route: 'Red' }, 'parent_station');

// Fetch real-time predictions
const predictionsData = await MBTA_API.getPredictions('place-pktrm', { route: 'Red' });

// Fetch service alerts
const alertsData = await MBTA_API.getAlerts({ route: 'Red' });
```

#### Available Helper Functions

The `MBTA_API` object in `src/config/mbtaApi.js` provides these functions:

**1. GET /routes** - Get all routes
```javascript
const routes = await MBTA_API.getRoutes({ type: '0,1' }); // Subway lines only
```

**2. GET /stops** - Stops for selected routes and transfer stations
```javascript
const stops = await MBTA_API.getStops({ route: 'Red', location_type: 1 });
```

**3. GET /shapes** - Path geometry for mapping
```javascript
const shapes = await MBTA_API.getShapes('Red');
```

**4. GET /predictions** - Real-time arrivals/departures
```javascript
const predictions = await MBTA_API.getPredictions('place-pktrm', { route: 'Red' });
```

**5. GET /schedules** - Baseline schedules (fallback)
```javascript
const schedules = await MBTA_API.getSchedules('place-pktrm', { min_time: 'now' });
```

**6. GET /vehicles** - Live vehicle positions
```javascript
const vehicles = await MBTA_API.getVehicles('Red');
```

**7. GET /alerts** - Service alerts
```javascript
const alerts = await MBTA_API.getAlerts({ route: 'Red' });
```

**8. GET /facilities** - Elevator/escalator info
```javascript
const facilities = await MBTA_API.getFacilities('place-pktrm');
```

### 2. Map Integration

Add a mapping library:
```bash
npm install leaflet react-leaflet
# OR
npm install mapbox-gl react-map-gl
```

Implementation tasks:
- Initialize map centered on Boston
- Fetch and display MBTA route polylines
- Add stop markers with click handlers
- Implement route filtering toggles
- Show selected stops with different colors

### 3. State Management

Wire up the component connections:
- Connect StationSelector onChange handlers to App state
- Pass real station data from MBTA API
- Implement actual transfer time calculations
- Add real-time prediction polling (30-60 second intervals)

### 4. Transfer Logic

Implement core algorithms:
- Calculate walking distances between platforms
- Factor in accessibility (stairs vs elevators)
- Apply time-of-day crowding multipliers
- Compute transfer confidence scores
- Suggest alternative connections

### 5. Data Features

- Cache MBTA data for offline support
- Store user preferences (walking speed, preferred routes)
- Historical performance tracking
- Service alert notifications

## 🎨 Design System

### MBTA Official Colors
- Red Line: `#da291c`
- Orange Line: `#ed8b00`
- Green Line: `#00843d`
- Blue Line: `#003da5`
- Silver Line: `#7c878e`

### Confidence Levels
- **Likely** (Green): >90% success rate, 3+ min buffer
- **Risky** (Yellow): ~60% success rate, 1-3 min buffer
- **Unlikely** (Red): <25% success rate, <1 min buffer

## 📱 Responsive Design

The layout adapts to different screen sizes:
- Desktop: Side-by-side layout (sidebar + map)
- Tablet/Mobile: Stacked layout (map first, then sidebar)

## 🔧 Technologies Used

- **React** 19.2.0 - UI framework
- **Vite** 7.2.4 - Build tool
- **ESLint** - Code linting
- Modern CSS with Flexbox/Grid

## 📄 License

Built for Goat Hacks 2026

## 🙏 Acknowledgments

- Data provided by [MBTA](https://www.mbta.com/)
- MBTA V3 API: https://api-v3.mbta.com/
