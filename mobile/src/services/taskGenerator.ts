import { validateId, validateLatLng, getStopsByRoute } from '@api/mbtaClient';
import type { TripPlan, TripLeg } from './tripPlanner';
import type { VehicleData, PredictionData, StopData } from '@api/mbtaClient';
import { calculateDistance } from '@utils/helpers';

// Types
export type TaskType = 'walk-to-stop' | 'board' | 'ride' | 'transfer';

export interface TaskGeoFence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface GameTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  stopId?: string;
  stopName?: string;
  routeId?: string;
  routeName?: string;
  geoFence: TaskGeoFence;
  completed: boolean;
  xpReward: number;
  legIndex: number;
}

// Constants
const STOP_RADIUS_M = 100; // User must be within 100m of stop
const VEHICLE_RADIUS_M = 150; // Vehicle must be within 150m for boarding
const DEPARTURE_WINDOW_SEC = 120; // Departure must be within 2 minutes

// XP rewards
const XP_WALK = 10;
const XP_BOARD = 20;
const XP_RIDE = 30;
const XP_TRANSFER = 50;

// Validate task on creation
const validateTask = (task: GameTask): boolean => {
  if (!task.id || task.id.length === 0) {
    console.error('[TaskGenerator] Task missing ID');
    return false;
  }

  if (!task.type) {
    console.error('[TaskGenerator] Task missing type');
    return false;
  }

  if (task.stopId && !validateId(task.stopId)) {
    console.error('[TaskGenerator] Task has invalid stop ID');
    return false;
  }

  if (task.routeId && !validateId(task.routeId)) {
    console.error('[TaskGenerator] Task has invalid route ID');
    return false;
  }

  if (!task.geoFence) {
    console.error('[TaskGenerator] Task missing geoFence');
    return false;
  }

  if (!validateLatLng(task.geoFence.latitude, task.geoFence.longitude)) {
    console.error('[TaskGenerator] Task has invalid geoFence coordinates');
    return false;
  }

  if (task.geoFence.radiusMeters <= 0) {
    console.error('[TaskGenerator] Task has invalid geoFence radius');
    return false;
  }

  return true;
};

// Fetch stop details if coordinates missing
const fetchStopCoordinates = async (
  stopId: string,
  routeId: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const result = await getStopsByRoute(routeId);
    
    if (!result.ok || !result.data) {
      console.warn(`[TaskGenerator] Could not fetch stop details for ${stopId}`);
      return null;
    }

    const stop = result.data.data.find((s) => s.id === stopId);
    
    if (!stop) {
      console.warn(`[TaskGenerator] Stop ${stopId} not found in route ${routeId}`);
      return null;
    }

    if (!validateLatLng(stop.attributes.latitude, stop.attributes.longitude)) {
      console.warn(`[TaskGenerator] Stop ${stopId} has invalid coordinates`);
      return null;
    }

    return {
      latitude: stop.attributes.latitude,
      longitude: stop.attributes.longitude,
    };
  } catch (error) {
    console.error('[TaskGenerator] Error fetching stop coordinates:', error);
    return null;
  }
};

// Generate tasks from trip plan
export const generateTasks = async (
  tripPlan: TripPlan,
  allStops: StopData[]
): Promise<GameTask[]> => {
  const tasks: GameTask[] = [];

  for (let legIndex = 0; legIndex < tripPlan.legs.length; legIndex++) {
    const leg = tripPlan.legs[legIndex];

    // Find stop data
    let fromStop = allStops.find((s) => s.id === leg.fromStopId);
    let toStop = allStops.find((s) => s.id === leg.toStopId);

    // Fetch stop details if coordinates missing
    if (!fromStop || !validateLatLng(fromStop.attributes.latitude, fromStop.attributes.longitude)) {
      console.warn(`[TaskGenerator] Fetching coordinates for stop ${leg.fromStopId}`);
      const coords = await fetchStopCoordinates(leg.fromStopId, leg.routeId);
      
      if (coords) {
        fromStop = {
          id: leg.fromStopId,
          type: 'stop',
          attributes: {
            name: leg.fromStopName,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        } as StopData;
      } else {
        console.error(`[TaskGenerator] Could not get coordinates for stop ${leg.fromStopId}, skipping tasks`);
        continue;
      }
    }

    if (!toStop || !validateLatLng(toStop.attributes.latitude, toStop.attributes.longitude)) {
      console.warn(`[TaskGenerator] Fetching coordinates for stop ${leg.toStopId}`);
      const coords = await fetchStopCoordinates(leg.toStopId, leg.routeId);
      
      if (coords) {
        toStop = {
          id: leg.toStopId,
          type: 'stop',
          attributes: {
            name: leg.toStopName,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        } as StopData;
      } else {
        console.error(`[TaskGenerator] Could not get coordinates for stop ${leg.toStopId}, skipping tasks`);
        continue;
      }
    }

    // Task 1: Walk to stop
    const walkTask: GameTask = {
      id: `walk-${legIndex}-${leg.fromStopId}`,
      type: 'walk-to-stop',
      title: `Walk to ${leg.fromStopName}`,
      description: `Get to ${leg.fromStopName} to catch the ${leg.routeName}`,
      stopId: leg.fromStopId,
      stopName: leg.fromStopName,
      routeId: leg.routeId,
      routeName: leg.routeName,
      geoFence: {
        latitude: fromStop.attributes.latitude,
        longitude: fromStop.attributes.longitude,
        radiusMeters: STOP_RADIUS_M,
      },
      completed: false,
      xpReward: XP_WALK,
      legIndex,
    };

    if (validateTask(walkTask)) {
      tasks.push(walkTask);
    } else {
      console.error('[TaskGenerator] Walk task failed validation');
    }

    // Task 2: Board train
    const boardTask: GameTask = {
      id: `board-${legIndex}-${leg.routeId}`,
      type: 'board',
      title: `Board ${leg.routeName}`,
      description: `Board the ${leg.routeName} heading to ${leg.toStopName}`,
      stopId: leg.fromStopId,
      stopName: leg.fromStopName,
      routeId: leg.routeId,
      routeName: leg.routeName,
      geoFence: {
        latitude: fromStop.attributes.latitude,
        longitude: fromStop.attributes.longitude,
        radiusMeters: VEHICLE_RADIUS_M,
      },
      completed: false,
      xpReward: XP_BOARD,
      legIndex,
    };

    if (validateTask(boardTask)) {
      tasks.push(boardTask);
    } else {
      console.error('[TaskGenerator] Board task failed validation');
    }

    // Task 3: Ride to destination
    const rideTask: GameTask = {
      id: `ride-${legIndex}-${leg.toStopId}`,
      type: 'ride',
      title: `Ride to ${leg.toStopName}`,
      description: `Stay on the ${leg.routeName} until ${leg.toStopName}`,
      stopId: leg.toStopId,
      stopName: leg.toStopName,
      routeId: leg.routeId,
      routeName: leg.routeName,
      geoFence: {
        latitude: toStop.attributes.latitude,
        longitude: toStop.attributes.longitude,
        radiusMeters: STOP_RADIUS_M,
      },
      completed: false,
      xpReward: XP_RIDE,
      legIndex,
    };

    if (validateTask(rideTask)) {
      tasks.push(rideTask);
    } else {
      console.error('[TaskGenerator] Ride task failed validation');
    }

    // Task 4: Transfer (if applicable)
    if (leg.isTransfer && legIndex < tripPlan.legs.length - 1) {
      const nextLeg = tripPlan.legs[legIndex + 1];
      
      const transferTask: GameTask = {
        id: `transfer-${legIndex}-${leg.toStopId}`,
        type: 'transfer',
        title: `Transfer to ${nextLeg.routeName}`,
        description: `Transfer from ${leg.routeName} to ${nextLeg.routeName}`,
        stopId: leg.toStopId,
        stopName: leg.toStopName,
        routeId: nextLeg.routeId,
        routeName: nextLeg.routeName,
        geoFence: {
          latitude: toStop.attributes.latitude,
          longitude: toStop.attributes.longitude,
          radiusMeters: STOP_RADIUS_M,
        },
        completed: false,
        xpReward: XP_TRANSFER,
        legIndex,
      };

      if (validateTask(transferTask)) {
        tasks.push(transferTask);
      } else {
        console.error('[TaskGenerator] Transfer task failed validation');
      }
    }
  }

  console.log(`[TaskGenerator] Generated ${tasks.length} tasks from trip plan`);
  return tasks;
};

// Check if walk-to-stop task is completed
export const checkWalkToStopCompletion = (
  task: GameTask,
  userLat: number,
  userLng: number
): boolean => {
  if (task.type !== 'walk-to-stop') return false;

  const distance = calculateDistance(
    { latitude: userLat, longitude: userLng },
    { latitude: task.geoFence.latitude, longitude: task.geoFence.longitude }
  );

  return distance <= task.geoFence.radiusMeters;
};

// Check if board task is completed
export const checkBoardCompletion = (
  task: GameTask,
  userLat: number,
  userLng: number,
  vehicles: VehicleData[],
  predictions: PredictionData[]
): boolean => {
  if (task.type !== 'board') return false;
  if (!task.routeId || !task.stopId) return false;

  // Find vehicles on this route
  const routeVehicles = vehicles.filter(
    (v) => v.relationships?.route?.data?.id === task.routeId
  );

  if (routeVehicles.length === 0) {
    return false;
  }

  // Check if any vehicle is nearby
  for (const vehicle of routeVehicles) {
    const vehicleDistance = calculateDistance(
      { latitude: userLat, longitude: userLng },
      { latitude: vehicle.attributes.latitude, longitude: vehicle.attributes.longitude }
    );

    if (vehicleDistance > VEHICLE_RADIUS_M) {
      continue;
    }

    // Vehicle is nearby, check if departure is soon
    const prediction = predictions.find(
      (p) =>
        p.relationships?.stop?.data?.id === task.stopId &&
        p.relationships?.route?.data?.id === task.routeId
    );

    if (!prediction) {
      continue;
    }

    const departureTime = prediction.attributes.departure_time;
    if (!departureTime) {
      continue;
    }

    const departureTimestamp = new Date(departureTime).getTime();
    const now = Date.now();
    const timeUntilDeparture = (departureTimestamp - now) / 1000;

    if (timeUntilDeparture <= DEPARTURE_WINDOW_SEC && timeUntilDeparture >= 0) {
      return true;
    }
  }

  return false;
};

// Check if ride task is completed
export const checkRideCompletion = (
  task: GameTask,
  userLat: number,
  userLng: number
): boolean => {
  if (task.type !== 'ride') return false;

  const distance = calculateDistance(
    { latitude: userLat, longitude: userLng },
    { latitude: task.geoFence.latitude, longitude: task.geoFence.longitude }
  );

  return distance <= task.geoFence.radiusMeters;
};

// Auto-check all tasks
export const autoCheckTasks = (
  tasks: GameTask[],
  userLat: number,
  userLng: number,
  vehicles: VehicleData[],
  predictions: PredictionData[]
): GameTask[] => {
  return tasks.map((task) => {
    if (task.completed) return task;

    let completed = false;

    switch (task.type) {
      case 'walk-to-stop':
        completed = checkWalkToStopCompletion(task, userLat, userLng);
        break;
      case 'board':
        completed = checkBoardCompletion(task, userLat, userLng, vehicles, predictions);
        break;
      case 'ride':
      case 'transfer':
        completed = checkRideCompletion(task, userLat, userLng);
        break;
    }

    if (completed && !task.completed) {
      console.log(`[TaskGenerator] Task completed: ${task.title} (+${task.xpReward} XP)`);
    }

    return { ...task, completed };
  });
};
