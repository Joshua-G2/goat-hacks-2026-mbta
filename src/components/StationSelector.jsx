import React from 'react';
import './StationSelector.css';

/**
 * StationSelector Component
 * 
 * Purpose: Allow users to select origin, transfer, and destination stations
 * 
 * MBTA API Integration:
 * The MBTA API is configured in src/config/mbtaApi.js
 * Import and use: import MBTA_API from '../config/mbtaApi';
 * 
 * Implementation Tips:
 * - Fetch station list from MBTA V3 API
 * - Filter stops by type (subway stations vs bus stops)
 * - Implement autocomplete/search functionality for easier station finding
 * - Validate that origin, transfer, and destination are different
 * - Show route lines that serve each selected station
 * 
 * API Usage Examples:
 * 
 * 1. MBTA_API.getStops()
 *    Purpose: Get all stops/stations for the MBTA system
 *    Example: const data = await MBTA_API.getStops({ location_type: 1, route_type: '0,1' });
 *    Returns: Station names, IDs, coordinates, wheelchair accessibility
 * 
 * 2. MBTA_API.getStops() with route filter
 *    Purpose: Get stops served by a specific route
 *    Example: const data = await MBTA_API.getStops({ route: 'Red' });
 *    Returns: Stops that are on the specified route
 * 
 * 3. Get routes serving a stop (reverse lookup)
 *    Purpose: Get all routes that serve a particular stop (for transfer stations)
 *    Example: Fetch stop data and check relationships or use filters
 *    Tip: Stops with 2+ routes are transfer points
 * 
 * 4. MBTA_API.getStop(stopId)
 *    Purpose: Get detailed information about a specific stop
 *    Example: const data = await MBTA_API.getStop('place-pktrm');
 *    Returns: Full stop details, accessibility info, child platforms
 * 
 * Implementation Strategy:
 * - Load all subway stations on component mount using MBTA_API.getStops()
 * - Cache station data to avoid repeated API calls
 * - Implement client-side filtering for search functionality
 * - Fetch route information when a station is selected
 * - Validate transfer stations have connecting routes
 * 
 * Features to implement:
 * - Dropdown or autocomplete for each selection
 * - Clear/reset buttons
 * - Visual indicators of selection state
 * - Route badge display for each selected stop
 * - Transfer validation (ensure transfer station serves both routes)
 */
function StationSelector({ selectedStops, onStopChange }) {
  // TODO: Import MBTA_API from '../config/mbtaApi'
  // TODO: Fetch stops: const stops = await MBTA_API.getStops({ location_type: 1, route_type: '0,1' });
  // TODO: Cache station data in state or context
  // TODO: Implement search/filter functionality (client-side)
  // TODO: Fetch routes for selected station when needed
  // TODO: Validate transfer station has routes connecting origin and destination
  // TODO: Display route badges next to station names

  // Placeholder station data - replace with actual API data
  const placeholderStations = [
    'Park Street',
    'Downtown Crossing',
    'South Station',
    'North Station',
    'Back Bay',
    'Kendall/MIT',
    'Harvard',
    'Davis',
  ];

  const handleStationSelect = (type, station) => {
    // Call parent handler if provided
    if (onStopChange) {
      onStopChange(type, station);
    }
    console.log(`Selected ${type}: ${station}`);
  };

  return (
    <div className="station-selector">
      <h2>Select Your Journey</h2>
      
      <div className="selector-group">
        <label htmlFor="origin">
          <span className="label-icon">🚉</span>
          Origin Station
        </label>
        <select 
          id="origin"
          className="station-select"
          value={selectedStops?.origin || ''}
          onChange={(e) => handleStationSelect('origin', e.target.value)}
        >
          <option value="">-- Select origin --</option>
          {/* TODO: Map actual station data */}
          {placeholderStations.map(station => (
            <option key={`origin-${station}`} value={station}>
              {station}
            </option>
          ))}
        </select>
      </div>

      <div className="selector-group">
        <label htmlFor="transfer">
          <span className="label-icon">🔄</span>
          Transfer Station (Optional)
        </label>
        <select 
          id="transfer"
          className="station-select"
          value={selectedStops?.transfer || ''}
          onChange={(e) => handleStationSelect('transfer', e.target.value)}
        >
          <option value="">-- Select transfer --</option>
          {/* TODO: Filter to show only valid transfer stations */}
          {placeholderStations.map(station => (
            <option key={`transfer-${station}`} value={station}>
              {station}
            </option>
          ))}
        </select>
        <p className="helper-text">
          Select a transfer station if you need to change lines
        </p>
      </div>

      <div className="selector-group">
        <label htmlFor="destination">
          <span className="label-icon">🎯</span>
          Destination Station
        </label>
        <select 
          id="destination"
          className="station-select"
          value={selectedStops?.destination || ''}
          onChange={(e) => handleStationSelect('destination', e.target.value)}
        >
          <option value="">-- Select destination --</option>
          {/* TODO: Map actual station data */}
          {placeholderStations.map(station => (
            <option key={`dest-${station}`} value={station}>
              {station}
            </option>
          ))}
        </select>
      </div>

      <div className="action-buttons">
        <button className="btn-reset" onClick={() => console.log('Reset selections')}>
          Clear All
        </button>
        <button className="btn-find" onClick={() => console.log('Find transfers')}>
          Find Transfers
        </button>
      </div>
    </div>
  );
}

export default StationSelector;
