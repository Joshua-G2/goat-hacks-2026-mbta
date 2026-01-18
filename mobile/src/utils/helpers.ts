/**
 * Exponential backoff with jitter for retry logic
 */
export const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const exponentialBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const jitter = Math.random() * 1000;
        const delay = baseDelay * Math.pow(2, attempt) + jitter;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Convert meters to miles
 */
export const metersToMiles = (meters: number): number => {
  return meters / 1609.344;
};

/**
 * Decode Google polyline format to coordinates
 */
export const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  if (!encoded) return [];
  
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
};

/**
 * Format timestamp to human-readable time
 */
export const formatTimestamp = (timestamp: string | number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
