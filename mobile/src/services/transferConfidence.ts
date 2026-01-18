import type { TripPlan } from './tripPlanner';
import type { PredictionData } from '@api/mbtaClient';

// Types
export type ConfidenceBadge = 'Likely' | 'Risky' | 'Unlikely' | 'Unknown';

export interface TransferConfidence {
  badge: ConfidenceBadge;
  marginSeconds: number | null;
  arrivalTime: string | null;
  departureTime: string | null;
  walkTimeSeconds: number;
  missingData: boolean;
  usedScheduledTimes: boolean;
}

// Constants
const TRANSFER_BUFFER_SEC = 120; // 2 minutes buffer
const WALK_SPEED_MPS = 1.4; // 1.4 m/s average walking speed
const LIKELY_THRESHOLD_SEC = 240; // 4 minutes
const RISKY_THRESHOLD_SEC = 60; // 1 minute
const MAX_TRANSFER_WALK_M = 500; // Max walk distance

// Calculate walk time between transfer stops
const calculateWalkTime = (distanceM: number): number => {
  return Math.ceil(distanceM / WALK_SPEED_MPS);
};

// Find prediction for a stop and route
const findPrediction = (
  predictions: PredictionData[],
  stopId: string,
  routeId: string
): PredictionData | null => {
  for (const prediction of predictions) {
    const matchesStop = prediction.relationships?.stop?.data?.id === stopId;
    const matchesRoute = prediction.relationships?.route?.data?.id === routeId;
    
    if (matchesStop && matchesRoute) {
      return prediction;
    }
  }
  
  return null;
};

// Compute transfer confidence for a trip plan
export const computeTransferConfidence = (
  tripPlan: TripPlan,
  predictions: PredictionData[],
  walkSpeedMps: number = WALK_SPEED_MPS
): TransferConfidence[] => {
  const confidences: TransferConfidence[] = [];

  if (!tripPlan.hasTransfer || tripPlan.legs.length < 2) {
    // No transfers to analyze
    return confidences;
  }

  // Analyze each transfer point
  for (let i = 0; i < tripPlan.legs.length - 1; i++) {
    const currentLeg = tripPlan.legs[i];
    const nextLeg = tripPlan.legs[i + 1];

    // Transfer stop is the end of current leg
    const transferStopId = currentLeg.toStopId;

    // Find predictions
    const arrivalPrediction = findPrediction(
      predictions,
      transferStopId,
      currentLeg.routeId
    );
    const departurePrediction = findPrediction(
      predictions,
      transferStopId,
      nextLeg.routeId
    );

    // Calculate walk time (assume short walk at same stop or nearby)
    const walkTimeSeconds = calculateWalkTime(50); // Estimate 50m walk at transfer

    // Check if we have prediction data
    if (!arrivalPrediction || !departurePrediction) {
      console.warn(
        `[TransferConfidence] Missing predictions for transfer at ${transferStopId}`
      );

      confidences.push({
        badge: 'Unknown',
        marginSeconds: null,
        arrivalTime: null,
        departureTime: null,
        walkTimeSeconds,
        missingData: true,
        usedScheduledTimes: false,
      });

      continue;
    }

    // Extract times
    const arrivalTime =
      arrivalPrediction.attributes.arrival_time ||
      arrivalPrediction.attributes.departure_time;
    
    const departureTime =
      departurePrediction.attributes.departure_time ||
      departurePrediction.attributes.arrival_time;

    if (!arrivalTime || !departureTime) {
      console.warn(
        `[TransferConfidence] Missing time attributes for transfer at ${transferStopId}`
      );

      confidences.push({
        badge: 'Unknown',
        marginSeconds: null,
        arrivalTime: null,
        departureTime: null,
        walkTimeSeconds,
        missingData: true,
        usedScheduledTimes: false,
      });

      continue;
    }

    // Calculate margin
    const arrivalTimestamp = new Date(arrivalTime).getTime();
    const departureTimestamp = new Date(departureTime).getTime();
    const timeGapSeconds = (departureTimestamp - arrivalTimestamp) / 1000;
    const requiredTime = walkTimeSeconds + TRANSFER_BUFFER_SEC;
    const marginSeconds = timeGapSeconds - requiredTime;

    // Determine badge
    let badge: ConfidenceBadge;
    if (marginSeconds >= LIKELY_THRESHOLD_SEC) {
      badge = 'Likely';
    } else if (marginSeconds >= RISKY_THRESHOLD_SEC) {
      badge = 'Risky';
    } else {
      badge = 'Unlikely';
    }

    console.log(
      `[TransferConfidence] Transfer at ${transferStopId}: ${badge} ` +
      `(margin: ${marginSeconds.toFixed(0)}s, gap: ${timeGapSeconds.toFixed(0)}s, required: ${requiredTime}s)`
    );

    confidences.push({
      badge,
      marginSeconds,
      arrivalTime,
      departureTime,
      walkTimeSeconds,
      missingData: false,
      usedScheduledTimes: false,
    });
  }

  return confidences;
};

// Fallback: use scheduled times if predictions missing
export const computeTransferConfidenceWithSchedules = async (
  tripPlan: TripPlan,
  predictions: PredictionData[],
  schedules: any[] // TODO: Define schedule type
): Promise<TransferConfidence[]> => {
  // For now, just use predictions
  // In a full implementation, would fetch /schedules endpoint and use as fallback
  const confidences = computeTransferConfidence(tripPlan, predictions);

  // Mark which ones fell back to schedules
  return confidences.map((conf) => {
    if (conf.missingData && schedules.length > 0) {
      // TODO: Implement schedule fallback logic
      return { ...conf, usedScheduledTimes: true };
    }
    return conf;
  });
};

// Get badge color for UI
export const getBadgeColor = (badge: ConfidenceBadge): string => {
  switch (badge) {
    case 'Likely':
      return '#00843D'; // Green
    case 'Risky':
      return '#ED8B00'; // Orange
    case 'Unlikely':
      return '#D32F2F'; // Red
    case 'Unknown':
      return '#757575'; // Gray
  }
};

// Get badge emoji
export const getBadgeEmoji = (badge: ConfidenceBadge): string => {
  switch (badge) {
    case 'Likely':
      return '✅';
    case 'Risky':
      return '⚠️';
    case 'Unlikely':
      return '❌';
    case 'Unknown':
      return '❓';
  }
};
