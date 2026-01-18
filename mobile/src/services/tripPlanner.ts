import { validateId, validateLatLng } from '@api/mbtaClient';
import type { StopData, RouteData } from '@api/mbtaClient';
import { calculateDistance } from '@utils/helpers';

// Types
export interface TripLeg {
  routeId: string;
  routeName: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  isTransfer?: boolean;
}

export interface TripPlan {
  legs: TripLeg[];
  totalDistance: number;
  hasTransfer: boolean;
  warnings: string[];
  missingShapes: boolean;
}

export interface TripPlanResult {
  ok: boolean;
  plan?: TripPlan;
  error?: string;
  recoverable?: boolean;
}

// Constants
const BOUNDING_BOX_KM = 2; // Search within 2km radius
const MAX_TRANSFER_DISTANCE_M = 500; // Max walk distance between transfer stops

// Find nearest stop to user location
const findNearestStop = async (
  lat: number,
  lng: number,
  allStops: StopData[]
): Promise<StopData | null> => {
  if (!validateLatLng(lat, lng)) {
    console.error('[TripPlanner] Invalid user coordinates');
    return null;
  }

  if (allStops.length === 0) {
    console.warn('[TripPlanner] No stops available for nearest stop search');
    return null;
  }

  let nearest: StopData | null = null;
  let minDistance = Infinity;

  for (const stop of allStops) {
    if (!validateLatLng(stop.attributes.latitude, stop.attributes.longitude)) {
      continue;
    }

    const distance = calculateDistance(
      { latitude: lat, longitude: lng },
      { latitude: stop.attributes.latitude, longitude: stop.attributes.longitude }
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  if (nearest) {
    console.log(`[TripPlanner] Nearest stop: ${nearest.attributes.name} (${minDistance.toFixed(0)}m away)`);
  }

  return nearest;
};

// Find routes that serve a stop
const getRoutesForStop = (stop: StopData, allRoutes: RouteData[]): RouteData[] => {
  const routes: RouteData[] = [];

  // Extract route relationships from stop
  const routeRelationships = stop.relationships?.route?.data;
  
  if (!routeRelationships) {
    console.warn(`[TripPlanner] No route relationships for stop ${stop.id}`);
    return routes;
  }

  // Handle both single route and array of routes
  const routeIds = Array.isArray(routeRelationships)
    ? routeRelationships.map((r: any) => r.id)
    : [routeRelationships.id];

  for (const routeId of routeIds) {
    const route = allRoutes.find((r) => r.id === routeId);
    if (route) {
      routes.push(route);
    }
  }

  return routes;
};

// Find common routes between two stops
const findCommonRoutes = (
  startRoutes: RouteData[],
  destRoutes: RouteData[]
): RouteData[] => {
  const common: RouteData[] = [];

  for (const startRoute of startRoutes) {
    for (const destRoute of destRoutes) {
      if (startRoute.id === destRoute.id) {
        common.push(startRoute);
      }
    }
  }

  return common;
};

// Find transfer stop between two routes
const findTransferStop = (
  route1: RouteData,
  route2: RouteData,
  allStops: StopData[]
): StopData | null => {
  const route1Stops = allStops.filter((stop) => {
    const routes = getRoutesForStop(stop, [route1]);
    return routes.length > 0;
  });

  const route2Stops = allStops.filter((stop) => {
    const routes = getRoutesForStop(stop, [route2]);
    return routes.length > 0;
  });

  // Find stops that serve both routes and are within transfer distance
  for (const stop1 of route1Stops) {
    for (const stop2 of route2Stops) {
      if (stop1.id === stop2.id) {
        console.log(`[TripPlanner] Found direct transfer stop: ${stop1.attributes.name}`);
        return stop1;
      }

      // Check if stops are close enough for transfer
      const distance = calculateDistance(
        { latitude: stop1.attributes.latitude, longitude: stop1.attributes.longitude },
        { latitude: stop2.attributes.latitude, longitude: stop2.attributes.longitude }
      );

      if (distance <= MAX_TRANSFER_DISTANCE_M) {
        console.log(`[TripPlanner] Found nearby transfer: ${stop1.attributes.name} -> ${stop2.attributes.name} (${distance.toFixed(0)}m)`);
        return stop1; // Use first stop as transfer point
      }
    }
  }

  return null;
};

// Validate trip leg
const validateTripLeg = (leg: TripLeg): boolean => {
  if (!validateId(leg.routeId)) {
    console.error('[TripPlanner] Invalid route ID in leg');
    return false;
  }
  if (!validateId(leg.fromStopId) || !validateId(leg.toStopId)) {
    console.error('[TripPlanner] Invalid stop IDs in leg');
    return false;
  }
  if (!leg.routeName || !leg.fromStopName || !leg.toStopName) {
    console.error('[TripPlanner] Missing names in leg');
    return false;
  }
  return true;
};

// Main trip planning function
export const planTrip = async (
  userLat: number,
  userLng: number,
  selectedDestination: StopData,
  allStops: StopData[],
  allRoutes: RouteData[]
): Promise<TripPlanResult> => {
  const warnings: string[] = [];

  try {
    // Validate inputs
    if (!validateLatLng(userLat, userLng)) {
      return {
        ok: false,
        error: 'Invalid user location coordinates',
        recoverable: false,
      };
    }

    if (!validateId(selectedDestination.id)) {
      return {
        ok: false,
        error: 'Invalid destination stop',
        recoverable: false,
      };
    }

    // Find nearest stop to user
    const startStop = await findNearestStop(userLat, userLng, allStops);
    
    if (!startStop) {
      return {
        ok: false,
        error: 'Could not find nearby start stop',
        recoverable: true,
      };
    }

    // Check if start and destination are the same
    if (startStop.id === selectedDestination.id) {
      return {
        ok: false,
        error: 'Start and destination are the same stop',
        recoverable: false,
      };
    }

    // Find routes for both stops
    const startRoutes = getRoutesForStop(startStop, allRoutes);
    const destRoutes = getRoutesForStop(selectedDestination, allRoutes);

    if (startRoutes.length === 0) {
      return {
        ok: false,
        error: 'No routes found at start stop',
        recoverable: true,
      };
    }

    if (destRoutes.length === 0) {
      return {
        ok: false,
        error: 'No routes found at destination stop',
        recoverable: true,
      };
    }

    // Find common routes (direct trip)
    const commonRoutes = findCommonRoutes(startRoutes, destRoutes);

    if (commonRoutes.length > 0) {
      // Direct route found
      const route = commonRoutes[0];
      const leg: TripLeg = {
        routeId: route.id,
        routeName: route.attributes.long_name || route.attributes.short_name,
        fromStopId: startStop.id,
        fromStopName: startStop.attributes.name,
        toStopId: selectedDestination.id,
        toStopName: selectedDestination.attributes.name,
      };

      if (!validateTripLeg(leg)) {
        return {
          ok: false,
          error: 'Generated trip leg failed validation',
          recoverable: true,
        };
      }

      const distance = calculateDistance(
        { latitude: startStop.attributes.latitude, longitude: startStop.attributes.longitude },
        { latitude: selectedDestination.attributes.latitude, longitude: selectedDestination.attributes.longitude }
      );

      console.log(`[TripPlanner] Direct route found: ${route.attributes.long_name}`);

      return {
        ok: true,
        plan: {
          legs: [leg],
          totalDistance: distance,
          hasTransfer: false,
          warnings,
          missingShapes: false, // Will be checked by caller
        },
      };
    }

    // No direct route - try to find transfer
    console.log('[TripPlanner] No direct route, searching for transfers...');

    for (const startRoute of startRoutes) {
      for (const destRoute of destRoutes) {
        const transferStop = findTransferStop(startRoute, destRoute, allStops);

        if (transferStop) {
          const leg1: TripLeg = {
            routeId: startRoute.id,
            routeName: startRoute.attributes.long_name || startRoute.attributes.short_name,
            fromStopId: startStop.id,
            fromStopName: startStop.attributes.name,
            toStopId: transferStop.id,
            toStopName: transferStop.attributes.name,
            isTransfer: true,
          };

          const leg2: TripLeg = {
            routeId: destRoute.id,
            routeName: destRoute.attributes.long_name || destRoute.attributes.short_name,
            fromStopId: transferStop.id,
            fromStopName: transferStop.attributes.name,
            toStopId: selectedDestination.id,
            toStopName: selectedDestination.attributes.name,
          };

          if (!validateTripLeg(leg1) || !validateTripLeg(leg2)) {
            console.warn('[TripPlanner] Transfer legs failed validation, continuing search');
            continue;
          }

          const totalDistance =
            calculateDistance(
              { latitude: startStop.attributes.latitude, longitude: startStop.attributes.longitude },
              { latitude: transferStop.attributes.latitude, longitude: transferStop.attributes.longitude }
            ) +
            calculateDistance(
              { latitude: transferStop.attributes.latitude, longitude: transferStop.attributes.longitude },
              { latitude: selectedDestination.attributes.latitude, longitude: selectedDestination.attributes.longitude }
            );

          console.log(`[TripPlanner] Transfer route found: ${startRoute.attributes.long_name} -> ${destRoute.attributes.long_name}`);

          return {
            ok: true,
            plan: {
              legs: [leg1, leg2],
              totalDistance,
              hasTransfer: true,
              warnings,
              missingShapes: false,
            },
          };
        }
      }
    }

    // Fallback: best-effort direct route only (show user any route from start)
    console.warn('[TripPlanner] Transfer search failed, falling back to best-effort');
    warnings.push('No transfer found - showing direct route only as guidance');

    const bestRoute = startRoutes[0];
    const leg: TripLeg = {
      routeId: bestRoute.id,
      routeName: bestRoute.attributes.long_name || bestRoute.attributes.short_name,
      fromStopId: startStop.id,
      fromStopName: startStop.attributes.name,
      toStopId: selectedDestination.id,
      toStopName: selectedDestination.attributes.name,
    };

    const distance = calculateDistance(
      { latitude: startStop.attributes.latitude, longitude: startStop.attributes.longitude },
      { latitude: selectedDestination.attributes.latitude, longitude: selectedDestination.attributes.longitude }
    );

    return {
      ok: true,
      plan: {
        legs: [leg],
        totalDistance: distance,
        hasTransfer: false,
        warnings,
        missingShapes: true, // Fallback mode
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Trip planning failed';
    console.error('[TripPlanner] Error:', errorMessage);
    
    return {
      ok: false,
      error: errorMessage,
      recoverable: true,
    };
  }
};
