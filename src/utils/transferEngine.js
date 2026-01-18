import MBTA_API from '../config/mbtaApi';

/**
 * Transfer Evaluation Engine
 * Calculates transfer confidence based on real-time predictions
 */

const SAFETY_BUFFER = 90; // 90 seconds safety buffer
const WALK_SPEED_MPH = 3; // Average walk speed in mph
const FEET_PER_MILE = 5280;

export const TransferConfidence = {
  LIKELY: 'LIKELY',
  RISKY: 'RISKY',
  UNLIKELY: 'UNLIKELY',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Calculate walking time between two stops
 * @param {Object} stop1 - First stop with lat/lng
 * @param {Object} stop2 - Second stop with lat/lng
 * @param {number} walkSpeedMultiplier - Character speed multiplier (0.8-1.2)
 * @returns {number} Walk time in seconds
 */
export function calculateWalkTime(stop1, stop2, walkSpeedMultiplier = 1.0) {
  if (!stop1 || !stop2) return 180; // Default 3 minutes

  const lat1 = stop1.attributes.latitude;
  const lon1 = stop1.attributes.longitude;
  const lat2 = stop2.attributes.latitude;
  const lon2 = stop2.attributes.longitude;

  // Haversine formula for distance
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceMiles = R * c;
  
  // Add 50% for platform changes and indoor walking
  const effectiveDistance = distanceMiles * 1.5;
  const walkSpeed = WALK_SPEED_MPH * walkSpeedMultiplier;
  const timeHours = effectiveDistance / walkSpeed;
  const timeSeconds = timeHours * 3600;
  
  // Minimum 2 minutes for any transfer
  return Math.max(120, timeSeconds);
}

/**
 * Evaluate a single transfer connection
 * @param {Object} leg1 - First trip leg with arrival prediction
 * @param {Object} leg2 - Second trip leg with departure prediction  
 * @param {Object} transferStop - Stop where transfer occurs
 * @param {Object} nextStop - Stop after transfer
 * @param {number} walkSpeed - Character walk speed multiplier
 * @returns {Object} Transfer evaluation result
 */
export async function evaluateTransfer(leg1, leg2, transferStop, nextStop, walkSpeed = 1.0) {
  try {
    // Get predictions for both legs
    const [arrival1, departure2] = await Promise.all([
      getPredictionTime(leg1.stop, leg1.route, 'arrival'),
      getPredictionTime(leg2.stop, leg2.route, 'departure')
    ]);

    if (!arrival1 || !departure2) {
      return {
        confidence: TransferConfidence.UNKNOWN,
        buffer: null,
        arrivalTime: arrival1,
        departureTime: departure2,
        walkTime: null,
        reason: 'Missing real-time predictions'
      };
    }

    // Calculate walk time
    const walkTime = calculateWalkTime(transferStop, nextStop, walkSpeed);

    // Calculate buffer time
    const arrivalMs = new Date(arrival1).getTime();
    const departureMs = new Date(departure2).getTime();
    const bufferSeconds = (departureMs - arrivalMs) / 1000 - walkTime - SAFETY_BUFFER;

    // Classify transfer
    let confidence;
    if (bufferSeconds >= 240) { // 4 minutes or more
      confidence = TransferConfidence.LIKELY;
    } else if (bufferSeconds >= 60) { // 1-4 minutes
      confidence = TransferConfidence.RISKY;
    } else {
      confidence = TransferConfidence.UNLIKELY;
    }

    return {
      confidence,
      buffer: bufferSeconds,
      arrivalTime: arrival1,
      departureTime: departure2,
      walkTime,
      reason: `${Math.floor(bufferSeconds / 60)}m ${Math.floor(bufferSeconds % 60)}s buffer`
    };

  } catch (error) {
    console.error('Transfer evaluation error:', error);
    return {
      confidence: TransferConfidence.UNKNOWN,
      buffer: null,
      arrivalTime: null,
      departureTime: null,
      walkTime: null,
      reason: 'Evaluation failed: ' + error.message
    };
  }
}

/**
 * Get prediction time for a stop/route combination
 * Implements retry and fallback to schedules
 */
async function getPredictionTime(stopId, routeId, timeType = 'arrival', retryCount = 0) {
  try {
    const predictions = await MBTA_API.getPredictions(stopId, { route: routeId });
    
    if (predictions.data && predictions.data.length > 0) {
      const prediction = predictions.data[0];
      const time = timeType === 'arrival' 
        ? prediction.attributes.arrival_time 
        : prediction.attributes.departure_time;
      
      if (time) return time;
    }

    // Fallback to schedules if predictions missing
    if (retryCount === 0) {
      console.log('Prediction missing, trying schedules...');
      const schedules = await MBTA_API.getSchedules(stopId, { route: routeId });
      
      if (schedules.data && schedules.data.length > 0) {
        const schedule = schedules.data[0];
        const time = timeType === 'arrival'
          ? schedule.attributes.arrival_time
          : schedule.attributes.departure_time;
        
        if (time) {
          console.log('✓ Using scheduled time as fallback');
          return time;
        }
      }
    }

    // Retry once
    if (retryCount === 0) {
      console.log('Retrying prediction fetch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getPredictionTime(stopId, routeId, timeType, 1);
    }

    return null;

  } catch (error) {
    console.error(`Error fetching ${timeType} time:`, error);
    return null;
  }
}

/**
 * Continuously evaluate transfers (called every 8 seconds)
 */
export async function evaluateAllTransfers(tripPlan, walkSpeed) {
  if (!tripPlan || !tripPlan.legs || tripPlan.legs.length < 2) {
    return [];
  }

  const evaluations = [];
  
  for (let i = 0; i < tripPlan.legs.length - 1; i++) {
    const currentLeg = tripPlan.legs[i];
    const nextLeg = tripPlan.legs[i + 1];
    
    const evaluation = await evaluateTransfer(
      currentLeg,
      nextLeg,
      currentLeg.toStop,
      nextLeg.fromStop,
      walkSpeed
    );
    
    evaluations.push({
      from: currentLeg.route.attributes.long_name,
      to: nextLeg.route.attributes.long_name,
      transferStop: currentLeg.toStop.attributes.name,
      ...evaluation
    });
  }

  return evaluations;
}

/**
 * Get confidence badge styling
 */
export function getConfidenceBadge(confidence) {
  const badges = {
    [TransferConfidence.LIKELY]: {
      text: 'LIKELY ✓',
      color: '#4CAF50',
      bgColor: 'rgba(76, 175, 80, 0.2)',
      emoji: '✅'
    },
    [TransferConfidence.RISKY]: {
      text: 'RISKY ⚠',
      color: '#FF9800',
      bgColor: 'rgba(255, 152, 0, 0.2)',
      emoji: '⚠️'
    },
    [TransferConfidence.UNLIKELY]: {
      text: 'UNLIKELY ✗',
      color: '#F44336',
      bgColor: 'rgba(244, 67, 54, 0.2)',
      emoji: '❌'
    },
    [TransferConfidence.UNKNOWN]: {
      text: 'UNKNOWN ?',
      color: '#9E9E9E',
      bgColor: 'rgba(158, 158, 158, 0.2)',
      emoji: '❓'
    }
  };

  return badges[confidence] || badges[TransferConfidence.UNKNOWN];
}
