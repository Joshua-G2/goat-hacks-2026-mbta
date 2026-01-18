import ENV from '@utils/config';

// Configuration
const MAX_RETRY = 3;
const BASE_DELAY_MS = 1000;
const VALID_LAT_RANGE = { min: -90, max: 90 };
const VALID_LNG_RANGE = { min: -180, max: 180 };

// Types
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  recoverable?: boolean;
}

interface MBTAResponse<T> {
  data: T[];
  included?: any[];
  jsonapi?: any;
}

interface RouteData {
  id: string;
  type: string;
  attributes: {
    long_name: string;
    short_name: string;
    color: string;
    text_color: string;
    type: number;
    description: string;
  };
}

interface StopData {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    platform_code?: string;
    platform_name?: string;
  };
  relationships?: any;
}

interface ShapeData {
  id: string;
  type: string;
  attributes: {
    polyline: string;
    priority?: number;
  };
}

interface VehicleData {
  id: string;
  type: string;
  attributes: {
    latitude: number;
    longitude: number;
    bearing?: number;
    current_status: string;
    label?: string;
    speed?: number;
    updated_at: string;
  };
  relationships?: any;
}

interface PredictionData {
  id: string;
  type: string;
  attributes: {
    arrival_time?: string;
    departure_time?: string;
    direction_id: number;
    status?: string;
  };
  relationships?: any;
}

// Validation Helpers
export const validateLatLng = (lat: number, lng: number): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < VALID_LAT_RANGE.min || lat > VALID_LAT_RANGE.max) return false;
  if (lng < VALID_LNG_RANGE.min || lng > VALID_LNG_RANGE.max) return false;
  return true;
};

export const validateIsoTime = (time: string): boolean => {
  if (typeof time !== 'string') return false;
  const date = new Date(time);
  return !isNaN(date.getTime());
};

export const validateId = (id: string): boolean => {
  if (typeof id !== 'string') return false;
  return id.length > 0 && id.length < 256;
};

// Logging
const logApiCall = (
  endpoint: string,
  duration: number,
  statusCode: number,
  routeIdsCount?: number
) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[MBTA API] ${timestamp} | ${endpoint} | ${statusCode} | ${duration}ms${
      routeIdsCount !== undefined ? ` | routes: ${routeIdsCount}` : ''
    }`
  );
};

// Exponential Backoff with Retry
const fetchWithRetry = async <T>(
  url: string,
  options: RequestInit = {},
  attempt = 1
): Promise<ApiResult<T>> => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    logApiCall(url.split('?')[0], duration, response.status);

    if (!response.ok) {
      const recoverable = response.status >= 500 || response.status === 429;
      
      if (recoverable && attempt < MAX_RETRY) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[MBTA API] Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRY})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry<T>(url, options, attempt + 1);
      }

      return {
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        recoverable,
      };
    }

    const json = await response.json();

    // Validate response structure
    if (!json.data) {
      return {
        ok: false,
        error: 'Malformed response: missing data field',
        recoverable: true,
      };
    }

    return { ok: true, data: json as T };
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiCall(url.split('?')[0], duration, 0);

    const errorMessage = error instanceof Error ? error.message : 'Network error';
    
    if (attempt < MAX_RETRY) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[MBTA API] Network error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRY})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry<T>(url, options, attempt + 1);
    }

    return {
      ok: false,
      error: errorMessage,
      recoverable: true,
    };
  }
};

// Build headers
const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.api+json',
  };

  if (ENV.MBTA_API_KEY) {
    headers['x-api-key'] = ENV.MBTA_API_KEY;
  } else {
    console.warn('[MBTA API] No API key found - using unauthenticated requests');
  }

  return headers;
};

// API Functions

export const getRoutes = async (): Promise<ApiResult<MBTAResponse<RouteData>>> => {
  const url = `${ENV.MBTA_API_BASE_URL}/routes`;
  const result = await fetchWithRetry<MBTAResponse<RouteData>>(url, {
    headers: getHeaders(),
  });

  if (result.ok && result.data) {
    logApiCall('/routes', 0, 200, result.data.data.length);
  }

  return result;
};

export const getStopsByRoute = async (
  routeId: string
): Promise<ApiResult<MBTAResponse<StopData>>> => {
  if (!validateId(routeId)) {
    return {
      ok: false,
      error: 'Invalid route ID',
      recoverable: false,
    };
  }

  const url = `${ENV.MBTA_API_BASE_URL}/stops?filter[route]=${encodeURIComponent(routeId)}`;
  const result = await fetchWithRetry<MBTAResponse<StopData>>(url, {
    headers: getHeaders(),
  });

  // Validate stop coordinates
  if (result.ok && result.data) {
    result.data.data = result.data.data.filter((stop) => {
      const valid = validateLatLng(
        stop.attributes.latitude,
        stop.attributes.longitude
      );
      if (!valid) {
        console.warn(`[MBTA API] Invalid coords for stop ${stop.id}`);
      }
      return valid;
    });
  }

  return result;
};

export const searchStopsByName = async (
  query: string
): Promise<ApiResult<MBTAResponse<StopData>>> => {
  if (!query || query.trim().length === 0) {
    return {
      ok: false,
      error: 'Empty search query',
      recoverable: false,
    };
  }

  // MBTA API doesn't support filter[name], so get all stops and filter client-side
  // Use page[limit] to get more results
  const url = `${ENV.MBTA_API_BASE_URL}/stops?page[limit]=1000`;
  const result = await fetchWithRetry<MBTAResponse<StopData>>(url, {
    headers: getHeaders(),
  });

  // Filter by name client-side and validate
  if (result.ok && result.data) {
    const lowerQuery = query.toLowerCase().trim();
    result.data.data = result.data.data.filter((stop) => {
      const validCoords = validateLatLng(
        stop.attributes.latitude,
        stop.attributes.longitude
      );
      const validId = validateId(stop.id);
      const matchesName = stop.attributes.name?.toLowerCase().includes(lowerQuery);
      
      if (!validCoords || !validId) {
        console.warn(`[MBTA API] Invalid stop data: ${stop.id}`);
        return false;
      }
      
      return matchesName;
    });

    console.log(`[MBTA API] Found ${result.data.data.length} stops matching "${query}"`);
  }

  return result;
};

export const getShapesByRoute = async (
  routeId: string
): Promise<ApiResult<MBTAResponse<ShapeData>>> => {
  if (!validateId(routeId)) {
    return {
      ok: false,
      error: 'Invalid route ID',
      recoverable: false,
    };
  }

  const url = `${ENV.MBTA_API_BASE_URL}/shapes?filter[route]=${encodeURIComponent(routeId)}`;
  const result = await fetchWithRetry<MBTAResponse<ShapeData>>(url, {
    headers: getHeaders(),
  });

  return result;
};

export const getVehiclesByRoute = async (
  routeIds: string[]
): Promise<ApiResult<MBTAResponse<VehicleData>>> => {
  if (!routeIds || routeIds.length === 0) {
    return {
      ok: true,
      data: { data: [] },
    };
  }

  // Validate all route IDs
  const validRouteIds = routeIds.filter((id) => {
    const valid = validateId(id);
    if (!valid) {
      console.warn(`[MBTA API] Skipping invalid route ID: ${id}`);
    }
    return valid;
  });

  if (validRouteIds.length === 0) {
    return {
      ok: false,
      error: 'No valid route IDs provided',
      recoverable: false,
    };
  }

  const routeFilter = validRouteIds.map(encodeURIComponent).join(',');
  const url = `${ENV.MBTA_API_BASE_URL}/vehicles?filter[route]=${routeFilter}`;
  
  const result = await fetchWithRetry<MBTAResponse<VehicleData>>(url, {
    headers: getHeaders(),
  });

  // Validate vehicle coordinates
  if (result.ok && result.data) {
    result.data.data = result.data.data.filter((vehicle) => {
      const valid = validateLatLng(
        vehicle.attributes.latitude,
        vehicle.attributes.longitude
      );
      if (!valid) {
        console.warn(`[MBTA API] Invalid coords for vehicle ${vehicle.id}`);
      }
      return valid;
    });

    logApiCall('/vehicles', 0, 200, result.data.data.length);
  }

  return result;
};

export const getPredictionsByStop = async (
  stopId: string,
  routeIds: string[]
): Promise<ApiResult<MBTAResponse<PredictionData>>> => {
  if (!validateId(stopId)) {
    return {
      ok: false,
      error: 'Invalid stop ID',
      recoverable: false,
    };
  }

  const params = new URLSearchParams();
  params.set('filter[stop]', stopId);
  
  if (routeIds && routeIds.length > 0) {
    const validRouteIds = routeIds.filter(validateId);
    if (validRouteIds.length > 0) {
      params.set('filter[route]', validRouteIds.join(','));
    }
  }

  const url = `${ENV.MBTA_API_BASE_URL}/predictions?${params.toString()}`;
  const result = await fetchWithRetry<MBTAResponse<PredictionData>>(url, {
    headers: getHeaders(),
  });

  // Validate timestamps
  if (result.ok && result.data) {
    result.data.data = result.data.data.filter((prediction) => {
      const arrivalValid = prediction.attributes.arrival_time
        ? validateIsoTime(prediction.attributes.arrival_time)
        : true;
      const departureValid = prediction.attributes.departure_time
        ? validateIsoTime(prediction.attributes.departure_time)
        : true;

      if (!arrivalValid || !departureValid) {
        console.warn(`[MBTA API] Invalid time for prediction ${prediction.id}`);
      }

      return arrivalValid && departureValid;
    });
  }

  return result;
};

// Export types
export type {
  RouteData,
  StopData,
  ShapeData,
  VehicleData,
  PredictionData,
  MBTAResponse,
};
