# MBTA Real-Time Transfer Helper

A React-based web application for planning MBTA transfers with real-time predictions and transfer guidance.

## 🎯 Features

### ✅ Implemented (Template/Layout)

1. **Interactive Map Display**
   - Template for displaying MBTA routes and stops
   - Route legend with official MBTA colors (Red, Orange, Green, Blue lines)
   - Placeholder for interactive map (ready for Leaflet/Mapbox integration)
   - Selection state tracking for origin, transfer, and destination

2. **Station Selector**
   - Dropdown selectors for origin, transfer (optional), and destination stations
   - Clear visual hierarchy with emoji icons
   - Action buttons (Clear All, Find Transfers)
   - Helper text for user guidance

3. **Transfer Guidance**
   - Walking speed adjustment (Slow, Normal, Fast)
   - Transfer time estimation with step-by-step breakdown
   - Accessibility information placeholder
   - Peak hour warnings

4. **Live Connection Finder**
   - Display template for next available trains
   - Real-time countdown and arrival times
   - Route summary with origin → transfer → destination flow
   - Connection cards with status indicators (on-time/delayed)
   - Auto-refresh functionality placeholder

5. **Confidence Indicator**
   - Likely/Risky/Unlikely badges based on transfer feasibility
   - Success rate percentages
   - Detailed breakdown of timing factors
   - Alternative suggestions for unlikely transfers

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### API Setup

**Important**: This project requires an MBTA API key. See `API_SETUP.md` for detailed instructions.

Quick setup:
```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your MBTA API key
# See API_SETUP.md for the key details

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📋 Next Steps for Implementation

### 1. MBTA API Integration

**✅ API Key Already Configured**

The MBTA API key has been obtained and is ready to use. See `API_SETUP.md` for complete setup instructions.

- **Rate Limit**: 1000 requests per minute
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
