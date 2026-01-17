import React from 'react';
import './InteractiveMap.css';

/**
 * InteractiveMap Component
 * 
 * Purpose: Display MBTA routes and stops on an interactive map
 * 
 * MBTA API Integration:
 * The MBTA API is configured in src/config/mbtaApi.js
 * Import and use: import MBTA_API from '../config/mbtaApi';
 * 
 * Implementation Tips:
 * - Use a mapping library like Leaflet or Mapbox GL JS
 * - Fetch MBTA route data from the MBTA V3 API
 * - Display different route types (subway, bus, commuter rail) with distinct colors
 * - Allow users to click on stops to select them
 * - Highlight selected origin, transfer, and destination stops differently
 * 
 * API Usage Examples:
 * 
 * 1. MBTA_API.getRoutes()
 *    Purpose: Fetch all available MBTA routes
 *    Example: const data = await MBTA_API.getRoutes({ type: '0,1' });
 *    Returns: Route ID, color codes, direction names, long/short names
 * 
 * 2. MBTA_API.getStops()
 *    Purpose: Get stops for selected routes and identify transfer stations
 *    Example: const data = await MBTA_API.getStops({ route: 'Red' }, 'parent_station');
 *    Returns: Stop coordinates (latitude/longitude), names, parent stations
 *    Tip: Stops with multiple routes are transfer stations
 * 
 * 3. MBTA_API.getShapes(routeId)
 *    Purpose: Get path geometry for mapping route lines
 *    Example: const data = await MBTA_API.getShapes('Red');
 *    Returns: Polyline data for drawing route paths on map
 *    Format: Array of {latitude, longitude, sequence} points
 *    Tip: Use this to draw the actual train lines between stops
 * 
 * 4. MBTA_API.getStop(stopId, include)
 *    Purpose: Get detailed stop information including location
 *    Example: const data = await MBTA_API.getStop('place-pktrm');
 *    Returns: Exact coordinates, wheelchair accessibility, platform info
 * 
 * Implementation Steps:
 * 1. Fetch all routes: const routes = await MBTA_API.getRoutes();
 * 2. For each route, fetch shapes: const shapes = await MBTA_API.getShapes(route.id);
 * 3. Fetch all stops: const stops = await MBTA_API.getStops({ location_type: 1 });
 * 4. Render shapes as polylines on map using route color
 * 5. Render stops as markers with click handlers
 * 6. Filter stops to show only major transfer stations for clarity
 * 
 * Features to implement:
 * - Zoom and pan controls
 * - Route filtering (show/hide specific lines)
 * - Stop markers with hover tooltips showing stop names
 * - Click handlers for stop selection
 * - Different marker styles for regular stops vs transfer stations
 */
function InteractiveMap({ selectedStops }) {
  // TODO: Import MBTA_API from '../config/mbtaApi'
  // TODO: Initialize map library (Leaflet or Mapbox)
  // TODO: Fetch routes: const routes = await MBTA_API.getRoutes();
  // TODO: Fetch shapes: const shapes = await MBTA_API.getShapes(routeId);
  // TODO: Fetch stops: const stops = await MBTA_API.getStops({ location_type: 1 });
  // TODO: Render routes as polylines using shape data
  // TODO: Render stops as markers on map
  // TODO: Handle stop click events to update selectedStops

  return (
    <div className="interactive-map">
      <div className="map-header">
        <h2>MBTA System Map</h2>
        <div className="map-controls">
          {/* TODO: Add route filter toggles */}
          {/* TODO: Add zoom controls if needed */}
        </div>
      </div>
      
      <div className="map-container">
        {/* TODO: Replace with actual map implementation */}
        <div className="map-placeholder">
          <p>🗺️ Interactive Map Display</p>
          <p className="hint">
            Click on stops to select origin, transfer point, and destination
          </p>
          
          {/* Placeholder for demonstration */}
          <div className="route-legend">
            <h3>Routes</h3>
            <div className="legend-item red-line">Red Line</div>
            <div className="legend-item orange-line">Orange Line</div>
            <div className="legend-item green-line">Green Line</div>
            <div className="legend-item blue-line">Blue Line</div>
          </div>
        </div>
      </div>

      {selectedStops && (
        <div className="selected-stops-preview">
          <p>Origin: {selectedStops.origin || 'Not selected'}</p>
          <p>Transfer: {selectedStops.transfer || 'Not selected'}</p>
          <p>Destination: {selectedStops.destination || 'Not selected'}</p>
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;
