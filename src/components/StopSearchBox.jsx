import { useState, useEffect, useRef } from 'react';
import MBTA_API from '../config/mbtaApi';
import './StopSearchBox.css';

function StopSearchBox({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [stops, setStops] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStops = async () => {
      if (query.length < 2) {
        setStops([]);
        return;
      }

      setLoading(true);
      console.log('🔍 Searching for stops:', query);
      
      try {
        // Get all subway stops for all routes
        const routes = ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];
        const allStops = [];
        
        // Fetch stops for each route
        for (const route of routes) {
          try {
            const response = await MBTA_API.getStops({ route });
            if (response.data && Array.isArray(response.data)) {
              allStops.push(...response.data);
            }
          } catch (err) {
            console.warn(`Failed to fetch stops for ${route}:`, err);
          }
        }
        
        console.log('📊 Total stops fetched:', allStops.length);
        
        // Remove duplicates based on stop ID
        const uniqueStops = Array.from(
          new Map(allStops.map(stop => [stop.id, stop])).values()
        );
        
        // Filter stops by query
        const filtered = uniqueStops.filter(stop =>
          stop.attributes.name.toLowerCase().includes(query.toLowerCase())
        );
        
        console.log('✅ Filtered stops:', filtered.length);
        setStops(filtered.slice(0, 15)); // Show top 15 results
        setShowDropdown(true);
        
      } catch (error) {
        console.error('❌ Error searching stops:', error);
        setStops([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchStops, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (stop) => {
    setQuery(stop.attributes.name);
    setShowDropdown(false);
    onChange(stop);
  };

  const handleClear = () => {
    setQuery('');
    setStops([]);
    onChange(null);
  };

  return (
    <div className="stop-search-box" ref={dropdownRef}>
      <label className="search-label">{label}</label>
      <div className="search-input-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder || 'Type stop name...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        {query && (
          <button className="clear-btn" onClick={handleClear}>✕</button>
        )}
      </div>

      {showDropdown && query.length >= 2 && (
        <div className="search-dropdown">
          {loading && (
            <div className="dropdown-loading">
              <div className="spinner"></div>
              <span>Searching stops...</span>
            </div>
          )}
          
          {!loading && stops.length === 0 && (
            <div className="dropdown-empty">
              No stops found for "{query}"
              <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.7 }}>
                Try: "Park", "Central", "Harvard", etc.
              </div>
            </div>
          )}
          
          {!loading && stops.length > 0 && (
            <div className="dropdown-results">
              <div style={{ 
                padding: '8px 12px', 
                fontSize: '11px', 
                color: 'rgba(255,255,255,0.6)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                Found {stops.length} stop{stops.length > 1 ? 's' : ''}
              </div>
              {stops.map(stop => (
                <div
                  key={stop.id}
                  className="dropdown-item"
                  onClick={() => handleSelect(stop)}
                >
                  <div className="stop-icon">🚇</div>
                  <div className="stop-info">
                    <div className="stop-name">{stop.attributes.name}</div>
                    <div className="stop-description">
                      {stop.attributes.description || 'MBTA Station'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="selected-stop">
          <span className="selected-icon">✓</span>
          <span>{value.attributes.name}</span>
        </div>
      )}
    </div>
  );
}

export default StopSearchBox;
