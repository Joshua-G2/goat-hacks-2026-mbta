import React, { useState, useEffect } from 'react';
import './StationSelector.css';
import { MBTA_API } from '../config/mbtaApi';

/**
 * StationSelector Component
 * 
 * Allows users to search and select origin, transfer, and destination stations
 */
function StationSelector({ selectedStops, onStopChange }) {
  const [allStops, setAllStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search states for each selector
  const [originSearch, setOriginSearch] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  
  // Dropdown visibility
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  // Fetch all stops on mount
  useEffect(() => {
    const fetchStops = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all stops with limit increased for more results
        const data = await MBTA_API.getStops({}, null);
        
        if (data && data.data) {
          // Filter to only parent stations (location_type 1) and ensure valid coordinates
          const validStops = data.data.filter(stop => 
            stop.attributes.latitude && 
            stop.attributes.longitude &&
            (stop.attributes.location_type === 1 || stop.attributes.location_type === 0)
          );
          
          setAllStops(validStops);
          console.log(`Loaded ${validStops.length} stops from MBTA API`);
        }
      } catch (err) {
        console.error('Error fetching stops:', err);
        setError('Failed to load stations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStops();
  }, []);

  // Filter stops based on search query
  const filterStops = (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return allStops.slice(0, 50); // Show first 50 if no search
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allStops.filter(stop => 
      stop.attributes.name.toLowerCase().includes(query)
    ).slice(0, 20); // Limit to 20 results
  };

  const handleStopSelect = (type, stop) => {
    if (onStopChange) {
      onStopChange(type, stop);
    }
    
    // Update search text and hide dropdown
    if (type === 'origin') {
      setOriginSearch(stop.attributes.name);
      setShowOriginDropdown(false);
    } else if (type === 'transfer') {
      setTransferSearch(stop.attributes.name);
      setShowTransferDropdown(false);
    } else if (type === 'destination') {
      setDestinationSearch(stop.attributes.name);
      setShowDestinationDropdown(false);
    }
  };

  const renderSearchInput = (type, searchValue, setSearchValue, showDropdown, setShowDropdown) => {
    const filteredStops = filterStops(searchValue);
    const placeholder = `Search ${type} station...`;
    
    return (
      <div className="search-container">
        <input
          type="text"
          className="station-search"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          disabled={loading}
        />
        {showDropdown && !loading && (
          <div className="search-dropdown">
            {filteredStops.length > 0 ? (
              filteredStops.map(stop => (
                <div
                  key={stop.id}
                  className="dropdown-item"
                  onClick={() => handleStopSelect(type, stop)}
                >
                  <div className="stop-name">{stop.attributes.name}</div>
                  {stop.attributes.description && (
                    <div className="stop-description">{stop.attributes.description}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="dropdown-item no-results">
                No stations found. Try a different search.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="station-selector">
      <h2>Select Your Journey</h2>
      
      {loading && <div className="loading-message">Loading stations...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && (
        <>
          <div className="selector-group">
            <label htmlFor="origin">
              <span className="label-icon">🚉</span>
              Origin Station
            </label>
            {renderSearchInput('origin', originSearch, setOriginSearch, showOriginDropdown, setShowOriginDropdown)}
          </div>

          <div className="selector-group">
            <label htmlFor="transfer">
              <span className="label-icon">🔄</span>
              Transfer Station (Optional)
            </label>
            {renderSearchInput('transfer', transferSearch, setTransferSearch, showTransferDropdown, setShowTransferDropdown)}
          </div>

          <div className="selector-group">
            <label htmlFor="destination">
              <span className="label-icon">🎯</span>
              Destination Station
            </label>
            {renderSearchInput('destination', destinationSearch, setDestinationSearch, showDestinationDropdown, setShowDestinationDropdown)}
          </div>
        </>
      )}
    </div>
  );
}

export default StationSelector;
