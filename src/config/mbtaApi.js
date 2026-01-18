/**
 * MBTA API Configuration
 * 
 * This module provides centralized configuration for MBTA API access.
 * 
 * API Key Information:
 * - Rate limit: 1000 requests per minute
 * - Version: 2021-01-09
 * - Allowed domains: * (all domains)
 * - Documentation: https://api-v3.mbta.com/docs/swagger/index.html
 */

// API Configuration
export const MBTA_API_CONFIG = {
  baseURL:
    import.meta.env.VITE_MBTA_API_BASE_URL ||
    (import.meta.env.DEV ? '/api/mbta' : 'https://api-v3.mbta.com'),
  apiKey: import.meta.env.VITE_MBTA_API_KEY,
  rateLimit: 1000, // requests per minute
};

// Validate API key is present
if (!MBTA_API_CONFIG.apiKey) {
  console.warn('MBTA API key is not configured. Please set VITE_MBTA_API_KEY in .env file');
}

/**
 * Create headers for MBTA API requests
 * @returns {Headers} Headers object with API key
 */
export const getMBTAHeaders = () => {
  return {
    'x-api-key': MBTA_API_CONFIG.apiKey,
    'Content-Type': 'application/json',
  };
};

/**
 * Build full URL for MBTA API endpoint
 * @param {string} endpoint - API endpoint (e.g., '/routes', '/stops')
 * @param {Object} params - Query parameters as key-value pairs
 * @returns {string} Full URL with query parameters
 */
export const buildMBTAUrl = (endpoint, params = {}) => {
  const baseURL = MBTA_API_CONFIG.baseURL.startsWith('/')
    ? `${window.location.origin}${MBTA_API_CONFIG.baseURL.replace(/\/$/, '')}/`
    : MBTA_API_CONFIG.baseURL.replace(/\/?$/, '/');
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(normalizedEndpoint, baseURL);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
      } else {
        url.searchParams.append(key, value);
      }
    }
  });
  
  return url.toString();
};

/**
 * Fetch data from MBTA API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response data
 */
export const fetchMBTA = async (endpoint, params = {}) => {
  const url = buildMBTAUrl(endpoint, params);
  
  try {
    const response = await fetch(url, {
      headers: getMBTAHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`MBTA API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from MBTA API:', error);
    throw error;
  }
};

/**
 * Common API endpoint helpers
 */
export const MBTA_API = {
  /**
   * Fetch all routes
   * @param {Object} filters - Optional filters (e.g., { type: '0,1' } for subway)
   * @returns {Promise<Object>} Routes data
   */
  getRoutes: (filters = {}) => {
    return fetchMBTA('/routes', {
      'filter[type]': filters.type || '0,1', // Default to subway lines
      ...filters,
    });
  },

  /**
   * Fetch stops
   * @param {Object} filters - Filters (e.g., { route: 'Red', location_type: 1 })
   * @param {string} include - Related resources to include
   * @returns {Promise<Object>} Stops data
   */
  getStops: (filters = {}, include = null) => {
    const params = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      params[`filter[${key}]`] = value;
    });
    
    if (include) {
      params.include = include;
    }
    
    return fetchMBTA('/stops', params);
  },

  /**
   * Fetch shapes for route mapping
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} Shape/polyline data
   */
  getShapes: (routeId, directionId = null) => {
    return fetchMBTA('/shapes', {
      'filter[route]': routeId,
      'filter[direction_id]': directionId,
    });
  },

  /**
   * Fetch real-time predictions
   * @param {string} stopId - Stop ID
   * @param {Object} filters - Additional filters (route, direction_id)
   * @param {string} include - Related resources to include
   * @returns {Promise<Object>} Predictions data
   */
  getPredictions: (stopId, filters = {}, include = 'trip,route,vehicle') => {
    return fetchMBTA('/predictions', {
      'filter[stop]': stopId,
      'filter[route]': filters.route,
      'filter[direction_id]': filters.direction_id,
      sort: 'arrival_time',
      include,
    });
  },

  /**
   * Fetch schedules (fallback when predictions unavailable)
   * @param {string} stopId - Stop ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Schedules data
   */
  getSchedules: (stopId, filters = {}) => {
    return fetchMBTA('/schedules', {
      'filter[stop]': stopId,
      'filter[min_time]': filters.min_time || 'now',
      'filter[max_time]': filters.max_time,
      'filter[route]': filters.route,
      sort: 'arrival_time',
    });
  },

  /**
   * Fetch route patterns (ordered stops for routes)
   * @param {string} routeId - Route ID
   * @param {string} include - Related resources to include
   * @returns {Promise<Object>} Route pattern data
   */
  getRoutePatterns: (routeId, include = 'stops') => {
    return fetchMBTA('/route_patterns', {
      'filter[route]': routeId,
      include,
    });
  },

  /**
   * Fetch live vehicle positions
   * @param {string} routeId - Route ID
   * @param {string} include - Related resources to include
   * @returns {Promise<Object>} Vehicle data
   */
  getVehicles: (routeId, include = 'trip,stop,route') => {
    return fetchMBTA('/vehicles', {
      'filter[route]': routeId,
      include,
    });
  },

  /**
   * Fetch service alerts
   * @param {Object} filters - Filters (route, stop, activity)
   * @returns {Promise<Object>} Alerts data
   */
  getAlerts: (filters = {}) => {
    const params = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      params[`filter[${key}]`] = value;
    });
    
    return fetchMBTA('/alerts', params);
  },

  /**
   * Fetch facility information (elevators, escalators)
   * @param {string} stopId - Stop ID
   * @returns {Promise<Object>} Facilities data
   */
  getFacilities: (stopId) => {
    return fetchMBTA('/facilities', {
      'filter[stop]': stopId,
    });
  },

  /**
   * Fetch specific stop details
   * @param {string} stopId - Stop ID
   * @param {string} include - Related resources to include
   * @returns {Promise<Object>} Stop details
   */
  getStop: (stopId, include = 'parent_station,child_stops') => {
    return fetchMBTA(`/stops/${stopId}`, {
      include,
    });
  },
};

export default MBTA_API;
