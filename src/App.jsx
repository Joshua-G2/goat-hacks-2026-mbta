import { useState } from 'react'
import './App.css'
import InteractiveMap from './components/InteractiveMap'
import StationSelector from './components/StationSelector'
import TransferGuidance from './components/TransferGuidance'
import LiveConnectionFinder from './components/LiveConnectionFinder'
import ConfidenceIndicator from './components/ConfidenceIndicator'

/**
 * MBTA Real-Time Transfer Helper
 * 
 * Main application component that coordinates all sub-components
 * 
 * MBTA API Setup:
 * The MBTA API is configured in src/config/mbtaApi.js with the API key stored in .env
 * See API_SETUP.md for detailed setup instructions.
 * 
 * API Key Configuration:
 * - Rate Limit: 1000 requests per minute
 * - API Version: 2021-01-09
 * - Configuration file: .env (not committed to git)
 * - Example file: .env.example
 * 
 * Usage in components:
 * import MBTA_API from './config/mbtaApi';
 * const routes = await MBTA_API.getRoutes();
 * const stops = await MBTA_API.getStops({ location_type: 1 });
 * const predictions = await MBTA_API.getPredictions('place-pktrm', { route: 'Red' });
 * 
 * API Documentation: https://api-v3.mbta.com/docs/swagger/index.html
 * 
 * Key API Endpoints available via MBTA_API helper:
 * - MBTA_API.getRoutes() - Get all MBTA routes
 * - MBTA_API.getStops() - Get stops for selected routes and transfer stations
 * - MBTA_API.getShapes() - Get path geometry for mapping routes
 * - MBTA_API.getPredictions() - Get real-time arrivals/departures at stops
 * - MBTA_API.getSchedules() - Baseline scheduled arrivals (fallback)
 * - MBTA_API.getVehicles() - Optional: Get live vehicle positions
 * - MBTA_API.getAlerts() - Get service alerts and disruptions
 * - MBTA_API.getFacilities() - Get elevator/escalator information
 * - MBTA_API.getStop() - Get specific stop details
 * 
 * API Usage Tips:
 * - With 1000 req/min rate limit, you can poll predictions every 30-60 seconds
 * - Cache routes and stops data - they change infrequently
 * - Use include parameter to get related resources in one call
 * - Implement error handling for API failures
 * - Consider local storage for offline support
 * 
 * State Management:
 * - selectedStops: { origin, transfer, destination }
 * - Real-time predictions should update every 30-60 seconds
 * - Cache route and stop data to minimize API calls
 * 
 * Integration Points:
 * - MBTA V3 API via src/config/mbtaApi.js
 * - Map library: Leaflet or Mapbox GL JS (to be added)
 * - Real-time updates via polling predictions endpoint
 */
function App() {
  const [selectedStops, setSelectedStops] = useState({
    origin: null,
    transfer: null,
    destination: null,
  });

  const handleStopChange = (type, value) => {
    setSelectedStops(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚇 MBTA Real-Time Transfer Helper</h1>
        <p className="app-description">
          Plan your journey with live predictions and transfer guidance
        </p>
      </header>

      <div className="app-container">
        {/* Left Column: Station Selection and Transfer Info */}
        <aside className="app-sidebar">
          <StationSelector 
            selectedStops={selectedStops}
            onStopChange={handleStopChange}
          />
          
          <TransferGuidance 
            transferStation={selectedStops.transfer}
            walkingSpeed="normal"
          />

          <LiveConnectionFinder
            originStop={selectedStops.origin}
            transferStop={selectedStops.transfer}
            destinationStop={selectedStops.destination}
          />
        </aside>

        {/* Right Column: Map Display */}
        <main className="app-main">
          <InteractiveMap 
            selectedStops={selectedStops}
          />
          
          {/* Example confidence indicator */}
          {selectedStops.origin && selectedStops.destination && (
            <ConfidenceIndicator
              connection={{ arrivalTime: 300 }} // 5 minutes
              transferTime={240} // 4 minutes
              walkingTime={120} // 2 minutes
            />
          )}
        </main>
      </div>

      <footer className="app-footer">
        <p>
          Data provided by <a href="https://www.mbta.com/" target="_blank" rel="noopener noreferrer">MBTA</a>
          {' '} | {' '}
          Built for Goat Hacks 2026
        </p>
      </footer>
    </div>
  )
}

export default App
