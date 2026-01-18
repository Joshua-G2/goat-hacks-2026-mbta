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
   - Clear visual hierarchy with emoji icons
   - Action buttons and helper text

4. **Transfer Guidance**
   - Walking speed adjustment
   - Transfer time estimation
   - Accessibility information
   - Peak hour warnings

5. **Live Connection Finder**
   - Next available trains display
   - Real-time countdown and arrival times
   - Connection status indicators
   - Auto-refresh functionality

6. **Confidence Indicator**
   - Likely/Risky/Unlikely badges
   - Success rate percentages
   - Timing factor breakdowns
   - Alternative suggestions

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

---

### 🛠️ Technical Implementation

#### **Architecture**

```
┌─────────────────────────────────────────────────┐
│           React + Vite Frontend                 │
├─────────────────────────────────────────────────┤
│  Transit Mode          │      Game Mode         │
│  ├─ Trip Planner       │  ├─ Ticket Upload      │
│  ├─ Live Predictions   │  ├─ Journey Tracking   │
│  ├─ Map Display        │  ├─ XP System          │
│  └─ Transfer Guidance  │  └─ Blockchain Rewards │
├─────────────────────────────────────────────────┤
│           MBTA V3 API Service Layer             │
│  ├─ Real-time predictions                       │
│  ├─ Route shapes & stops                        │
│  └─ Service alerts                              │
├─────────────────────────────────────────────────┤
│        Solana Blockchain Integration            │
│  ├─ Memo Program (on-chain storage)            │
│  ├─ Wallet Adapter (Phantom/Solflare)          │
│  ├─ RPC with multi-endpoint fallback           │
│  └─ Transaction history & Explorer links       │
└─────────────────────────────────────────────────┘
```

#### **Key Technologies**

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | React + Vite | Fast development with HMR |
| **Mapping** | Leaflet + React-Leaflet | Interactive transit visualization |
| **Transit Data** | MBTA V3 API | Live predictions & route info |
| **Blockchain** | Solana Web3.js | On-chain transaction recording |
| **Wallet** | Phantom Adapter | Crypto wallet integration |
| **Geospatial** | Haversine Formula | Distance calculations |
| **Styling** | Custom CSS + Animations | Modern UI/UX |

#### **Smart Algorithms**

**1. Transfer Confidence Calculation:**
```javascript
// Time buffer analysis
const buffer = nextDepartureTime - arrivalTime - walkTime;
if (buffer > 5min) return "Likely";
if (buffer > 2min) return "Risky";
return "Unlikely";
```

**2. Distance Calculation (Haversine):**
```javascript
// Used for walking time estimation
const R = 6371e3; // Earth radius in meters
const φ1 = lat1 * π/180;
const φ2 = lat2 * π/180;
const Δφ = (lat2-lat1) * π/180;
const Δλ = (lon2-lon1) * π/180;

const a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2);
const c = 2·atan2(√a, √(1-a));
const distance = R × c; // meters
```

**3. Walking Time Estimation:**
```javascript
// Adjustable walking speed (default: 1.4 m/s ≈ 3 mph)
walkMinutes = (distanceMeters / speedMps) / 60;
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19+ or 22.12+
- MBTA V3 API key ([get one free](https://api-v3.mbta.com/))
- Phantom wallet ([download](https://phantom.app/)) for game mode

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Joshua-G2/goat-hacks-2026-mbta.git
cd goat-hacks-2026-mbta
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure MBTA API:**
Create `.env` file in project root:
```env
VITE_MBTA_API_KEY=your_api_key_here
```

4. **Run development server:**
```bash
npm run dev
```

5. **Open in browser:**
```
http://localhost:5173
```

### Using Transit Mode
1. Select **Origin** station (e.g., "Park Street")
2. Select **Transfer** station (optional, e.g., "Downtown Crossing")
3. Select **Destination** station (e.g., "Harvard Square")
4. View real-time predictions and transfer confidence
5. Monitor auto-refreshing arrivals

### Using Game Mode
1. Toggle to **Game Mode** via mode switch
2. **Connect Phantom wallet** (switch to DevNet in settings)
3. **Upload transit ticket** image (click upload area)
4. Select start and end stations
5. Click **"Start Journey"**
6. Navigate through stations (auto-advances or manual clicks)
7. Click **"Off Board"** at destination
8. **Approve 2 blockchain transactions** in Phantom
9. View transaction history in top-right panel
10. Check Solana Explorer for verification

---

## 📊 Project Statistics

- **Lines of Code:** ~5,000+
- **React Components:** 15+
- **MBTA Stations Supported:** 100+
- **Blockchain Transactions:** Real Solana DevNet
- **API Calls:** MBTA V3 REST API
- **Map Markers:** Custom Leaflet icons

---

## 🎓 What We Learned

- **Blockchain UX:** Making crypto feel simple for non-crypto users
- **API Resilience:** Multi-endpoint fallbacks for network reliability
- **Behavioral Economics:** Micro-rewards can change commuter behavior
- **Real-Time Systems:** Syncing GPS, API polling, and blockchain transactions
- **Geospatial Math:** Haversine formula for accurate distance calculations

---

## 🔮 Future Enhancements

### Near-Term (1-3 months)
- [ ] OCR/ML ticket validation (auto-verify tickets)
- [ ] Multi-city support (NYC MTA, SF BART, etc.)
- [ ] Leaderboards and social challenges
- [ ] Push notifications for transfers

### Long-Term (6-12 months)
- [ ] SPL token rewards (custom $MBTA token)
- [ ] NFT achievements for route exploration
- [ ] Integration with transit agency backends
- [ ] Predictive ML for delay forecasting

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **MBTA** for providing comprehensive open API
- **Solana Foundation** for blockchain infrastructure
- **Phantom** for excellent wallet UX
- **OpenStreetMap** for map tile data

---

## 📞 Contact

**Repository:** [github.com/Joshua-G2/goat-hacks-2026-mbta](https://github.com/Joshua-G2/goat-hacks-2026-mbta)

**Built for:** GOAT Hacks 2026 🏆

---

**Made with ❤️ for Boston commuters**

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

## 🏗️ Project Structure

```
src/
├── components/
│   ├── InteractiveMap.jsx           # Map display component
│   ├── StationSelector.jsx          # Station selection UI
│   ├── TransferGuidance.jsx         # Walking time & guidance
│   ├── LiveConnectionFinder.jsx     # Real-time predictions
│   └── ConfidenceIndicator.jsx      # Transfer feasibility badges
├── config/
│   └── mbtaApi.js                   # API configuration and helpers
├── App.jsx                          # Main app component
├── App.css                          # Main app styles
└── index.css                        # Global styles
```

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
