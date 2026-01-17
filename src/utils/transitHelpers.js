/**
 * Transit Helper Utilities
 * 
 * Utility functions for MBTA trip planning, walking time estimation,
 * and transfer confidence calculations.
 */

/**
 * Compute walking time in minutes given distance in meters and speed
 * @param {number} distanceMeters - Distance in meters
 * @param {number} speedMps - Walking speed in meters per second (default: 1.4 m/s ≈ 5 km/h)
 * @returns {number} Walking time in minutes
 */
export function computeWalkMinutes(distanceMeters, speedMps = 1.4) {
  const minutes = (distanceMeters / speedMps) / 60;
  return minutes;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate { latitude, longitude }
 * @param {Object} coord2 - Second coordinate { latitude, longitude }
 * @returns {number} Distance in meters
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Determine transfer confidence based on timing buffer vs. walk time
 * @param {Date|string} arrivalTime - Arrival time at transfer station
 * @param {Date|string} nextDepartureTime - Departure time of next connection
 * @param {number} walkMinutes - Required walking time in minutes
 * @returns {string} Confidence level: "Likely", "Risky", or "Unlikely"
 */
export function getTransferConfidence(arrivalTime, nextDepartureTime, walkMinutes) {
  const arrival = new Date(arrivalTime);
  const departure = new Date(nextDepartureTime);
  
  // Calculate buffer time between arrival and next departure (in minutes)
  const bufferMin = (departure - arrival) / 60000 - walkMinutes;
  
  if (bufferMin >= 5) return "Likely";       // Plenty of time
  if (bufferMin >= 2) return "Risky";        // Tight connection
  return "Unlikely";                          // Probably miss the connection
}

/**
 * Convert km/h to m/s
 * @param {number} kmh - Speed in kilometers per hour
 * @returns {number} Speed in meters per second
 */
export function kmhToMps(kmh) {
  return (kmh * 1000) / 3600;
}

/**
 * Format prediction time for display
 * @param {Date|string} time - Prediction time
 * @returns {string} Formatted time string
 */
export function formatPredictionTime(time) {
  const date = new Date(time);
  const now = new Date();
  const diffMinutes = Math.round((date - now) / 60000);
  
  if (diffMinutes < 1) return 'Arriving';
  if (diffMinutes === 1) return '1 min';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  
  // Format as time if more than an hour away
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Parse MBTA prediction data and extract next departure
 * @param {Object} predictionData - MBTA API prediction response
 * @returns {Object} Parsed prediction with departure_time, arrival_time, route info
 */
export function parseNextDeparture(predictionData) {
  if (!predictionData?.data || predictionData.data.length === 0) {
    return null;
  }
  
  const prediction = predictionData.data[0];
  return {
    id: prediction.id,
    arrivalTime: prediction.attributes.arrival_time,
    departureTime: prediction.attributes.departure_time,
    status: prediction.attributes.status,
    directionId: prediction.attributes.direction_id,
    routeId: prediction.relationships?.route?.data?.id,
    tripId: prediction.relationships?.trip?.data?.id,
    vehicleId: prediction.relationships?.vehicle?.data?.id,
  };
}

/**
 * Get transfer stations that connect two routes
 * @param {Array} route1Stops - Array of stops for first route
 * @param {Array} route2Stops - Array of stops for second route
 * @returns {Array} Array of common stops (transfer points)
 */
export function findTransferStations(route1Stops, route2Stops) {
  const route1StopIds = new Set(route1Stops.map(stop => stop.id));
  return route2Stops.filter(stop => route1StopIds.has(stop.id));
}

/**
 * Calculate trip time between two stops (in minutes)
 * Estimates based on typical MBTA speeds
 * @param {number} stops - Number of stops between origin and destination
 * @param {string} routeType - Route type (0=subway, 1=heavy rail, 3=bus)
 * @returns {number} Estimated trip time in minutes
 */
export function estimateTripTime(stops, routeType = '0') {
  // Average time per stop (includes dwell time)
  const timePerStop = {
    '0': 2.5, // Subway
    '1': 3,   // Heavy rail
    '3': 3.5, // Bus
  };
  
  const avgTime = timePerStop[routeType] || 3;
  return Math.ceil(stops * avgTime);
}
