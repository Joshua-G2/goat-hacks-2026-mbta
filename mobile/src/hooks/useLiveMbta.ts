import { useEffect, useRef, useState } from 'react';
import { getVehiclesByRoute, getPredictionsByStop } from '@api/mbtaClient';
import type { VehicleData, PredictionData } from '@api/mbtaClient';
import type { TripPlan } from '@services/tripPlanner';

// Constants
const MBTA_POLL_MS = 8000; // 8 seconds
const BACKOFF_POLL_MS = 15000; // 15 seconds on failure
const EMPTY_VEHICLE_THRESHOLD = 3; // Warn after 3 empty cycles
const STALE_PREDICTION_MS = 2 * 60 * 1000; // 2 minutes

export interface LiveMbtaState {
  vehicles: VehicleData[];
  predictions: PredictionData[];
  status: {
    polling: boolean;
    lowCoverage: boolean;
    stalePredictions: boolean;
    lastUpdate: number | null;
    consecutiveFailures: number;
  };
}

export const useLiveMbta = (tripPlan: TripPlan | null) => {
  const [state, setState] = useState<LiveMbtaState>({
    vehicles: [],
    predictions: [],
    status: {
      polling: false,
      lowCoverage: false,
      stalePredictions: false,
      lastUpdate: null,
      consecutiveFailures: 0,
    },
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emptyVehicleCyclesRef = useRef<number>(0);
  const currentPollDelayRef = useRef<number>(MBTA_POLL_MS);

  // Extract route IDs from trip plan
  const getRouteIds = (): string[] => {
    if (!tripPlan || !tripPlan.legs) return [];
    return tripPlan.legs.map((leg: any) => leg.routeId);
  };

  // Extract stop IDs from trip plan
  const getStopIds = (): string[] => {
    if (!tripPlan || !tripPlan.legs) return [];
    const stopIds = new Set<string>();
    
    tripPlan.legs.forEach((leg: any) => {
      stopIds.add(leg.fromStopId);
      stopIds.add(leg.toStopId);
    });
    
    return Array.from(stopIds);
  };

  // Check if predictions are stale
  const arePredictionsStale = (predictions: PredictionData[]): boolean => {
    if (predictions.length === 0) return false;

    const now = Date.now();
    
    for (const prediction of predictions) {
      const arrivalTime = prediction.attributes.arrival_time;
      const departureTime = prediction.attributes.departure_time;
      
      const relevantTime = arrivalTime || departureTime;
      if (!relevantTime) continue;

      const predictionTime = new Date(relevantTime).getTime();
      const age = now - predictionTime;

      if (age > STALE_PREDICTION_MS) {
        return true;
      }
    }

    return false;
  };

  // Poll vehicles and predictions
  const poll = async () => {
    const routeIds = getRouteIds();
    const stopIds = getStopIds();

    if (routeIds.length === 0 && stopIds.length === 0) {
      console.log('[LiveMbta] No trip plan, skipping poll');
      return;
    }

    try {
      // Poll vehicles
      const vehiclesResult = routeIds.length > 0
        ? await getVehiclesByRoute(routeIds)
        : { ok: true, data: { data: [] } };

      // Poll predictions for all stops
      const predictionsPromises = stopIds.map((stopId) =>
        getPredictionsByStop(stopId, routeIds)
      );
      const predictionsResults = await Promise.all(predictionsPromises);

      // Check for failures
      if (!vehiclesResult.ok || predictionsResults.some((r) => !r.ok)) {
        setState((prev) => ({
          ...prev,
          status: {
            ...prev.status,
            consecutiveFailures: prev.status.consecutiveFailures + 1,
          },
        }));

        // Backoff if multiple failures
        if (state.status.consecutiveFailures >= 2) {
          console.warn('[LiveMbta] Multiple failures, backing off to 15s polling');
          currentPollDelayRef.current = BACKOFF_POLL_MS;
          
          // Reset interval with new delay
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            startPolling();
          }
        }

        return;
      }

      // Extract data
      const vehicles = vehiclesResult.data?.data || [];
      const predictions = predictionsResults
        .filter((r) => r.ok && r.data)
        .flatMap((r) => r.data!.data);

      // Check for empty vehicles
      if (vehicles.length === 0) {
        emptyVehicleCyclesRef.current++;
        
        if (emptyVehicleCyclesRef.current >= EMPTY_VEHICLE_THRESHOLD) {
          console.warn('[LiveMbta] Low vehicle coverage detected (3+ empty cycles)');
        }
      } else {
        emptyVehicleCyclesRef.current = 0;
        
        // Auto-recover from backoff
        if (currentPollDelayRef.current === BACKOFF_POLL_MS) {
          console.log('[LiveMbta] Recovering to normal 8s polling');
          currentPollDelayRef.current = MBTA_POLL_MS;
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            startPolling();
          }
        }
      }

      // Check for stale predictions
      const stalePredictions = arePredictionsStale(predictions);

      setState({
        vehicles,
        predictions,
        status: {
          polling: true,
          lowCoverage: emptyVehicleCyclesRef.current >= EMPTY_VEHICLE_THRESHOLD,
          stalePredictions,
          lastUpdate: Date.now(),
          consecutiveFailures: 0, // Reset on success
        },
      });

      console.log(
        `[LiveMbta] Updated: ${vehicles.length} vehicles, ${predictions.length} predictions` +
        (stalePredictions ? ' (STALE)' : '')
      );
    } catch (error) {
      console.error('[LiveMbta] Poll error:', error);
      
      setState((prev) => ({
        ...prev,
        status: {
          ...prev.status,
          consecutiveFailures: prev.status.consecutiveFailures + 1,
        },
      }));
    }
  };

  // Start polling
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log(`[LiveMbta] Starting polling at ${currentPollDelayRef.current}ms intervals`);
    
    // Immediate poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      poll();
    }, currentPollDelayRef.current);

    setState((prev) => ({
      ...prev,
      status: { ...prev.status, polling: true },
    }));
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: { ...prev.status, polling: false },
    }));

    console.log('[LiveMbta] Polling stopped');
  };

  // Auto-start/stop based on trip plan
  useEffect(() => {
    if (tripPlan && tripPlan.legs.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [tripPlan]);

  return {
    vehicles: state.vehicles,
    predictions: state.predictions,
    status: state.status,
    refresh: poll,
  };
};
