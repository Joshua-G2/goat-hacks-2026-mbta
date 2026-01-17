import { useLocationStore } from '@store/locationStore';
import { useMBTAStore } from '@store/mbtaStore';
import { useGameStore } from '@store/gameStore';
import type { TripPlan } from './tripPlanner';
import type { GameTask } from './taskGenerator';

// Types
export interface SystemHealth {
  gps: {
    active: boolean;
    valid: boolean;
    stale: boolean;
    lastUpdate: number | null;
  };
  mbta: {
    polling: boolean;
    stale: boolean;
    lastUpdate: number | null;
    hasTripPlan: boolean;
  };
  tripPlan: {
    valid: boolean;
    hasLegs: boolean;
    idsPresent: boolean;
  };
  tasks: {
    synced: boolean;
    count: number;
  };
}

export interface DiagnosticLog {
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  category: 'gps' | 'mbta' | 'tripPlan' | 'tasks';
  message: string;
  action?: string;
}

export interface AutoFix {
  timestamp: number;
  category: string;
  issue: string;
  action: string;
  success: boolean;
}

export interface SupervisorState {
  health: SystemHealth;
  errors: DiagnosticLog[];
  warnings: DiagnosticLog[];
  lastAutoFix: AutoFix[];
  isRunning: boolean;
}

// Constants
const GPS_STALE_THRESHOLD_MS = 10000; // 10 seconds
const MBTA_STALE_THRESHOLD_MS = 20000; // 20 seconds
const SUPERVISOR_INTERVAL_MS = 3000; // 3 seconds
const MAX_LOG_ENTRIES = 50;
const MAX_AUTO_FIX_HISTORY = 20;

// Singleton state
let supervisorState: SupervisorState = {
  health: {
    gps: { active: false, valid: false, stale: false, lastUpdate: null },
    mbta: { polling: false, stale: false, lastUpdate: null, hasTripPlan: false },
    tripPlan: { valid: false, hasLegs: false, idsPresent: false },
    tasks: { synced: false, count: 0 },
  },
  errors: [],
  warnings: [],
  lastAutoFix: [],
  isRunning: false,
};

// Callbacks for auto-corrections (injected from app)
interface SupervisorCallbacks {
  restartGPS: () => Promise<void>;
  refreshMBTA: () => Promise<void>;
  regenerateTripPlan: (destinationStopId: string) => Promise<void>;
  regenerateTasks: (tripPlan: TripPlan, preserveCompleted: boolean) => Promise<void>;
}

let callbacks: SupervisorCallbacks | null = null;
let supervisorInterval: NodeJS.Timeout | null = null;
let lastDestinationStopId: string | null = null;
let lastTripPlan: TripPlan | null = null;
let lastTasks: GameTask[] = [];

// Logging
const addLog = (log: DiagnosticLog) => {
  if (log.level === 'error') {
    supervisorState.errors.push(log);
    if (supervisorState.errors.length > MAX_LOG_ENTRIES) {
      supervisorState.errors.shift();
    }
  } else if (log.level === 'warning') {
    supervisorState.warnings.push(log);
    if (supervisorState.warnings.length > MAX_LOG_ENTRIES) {
      supervisorState.warnings.shift();
    }
  }

  const emoji = log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[Supervisor] ${emoji} [${log.category}] ${log.message}${log.action ? ` → ${log.action}` : ''}`);
};

const addAutoFix = (fix: AutoFix) => {
  supervisorState.lastAutoFix.push(fix);
  if (supervisorState.lastAutoFix.length > MAX_AUTO_FIX_HISTORY) {
    supervisorState.lastAutoFix.shift();
  }

  const emoji = fix.success ? '✅' : '❌';
  console.log(
    `[Supervisor] ${emoji} AUTO-FIX [${fix.category}] ${fix.issue} → ${fix.action} ` +
    `(${fix.success ? 'SUCCESS' : 'FAILED'})`
  );
};

// Health checks
const checkGPSHealth = (): void => {
  const locationStore = useLocationStore.getState();
  const now = Date.now();

  const active = locationStore.isTracking;
  const lastUpdate = locationStore.userLocation?.timestamp || null;
  const stale = lastUpdate ? now - lastUpdate > GPS_STALE_THRESHOLD_MS : true;
  
  let valid = false;
  if (locationStore.userLocation) {
    const { latitude, longitude } = locationStore.userLocation;
    valid = !isNaN(latitude) && !isNaN(longitude) && 
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180;
  }

  supervisorState.health.gps = { active, valid, stale, lastUpdate };

  // Log issues
  if (!active) {
    addLog({
      timestamp: now,
      level: 'warning',
      category: 'gps',
      message: 'GPS tracking is not active',
      action: 'Will attempt restart',
    });
  } else if (!valid) {
    addLog({
      timestamp: now,
      level: 'error',
      category: 'gps',
      message: 'GPS coordinates are invalid',
      action: 'Will attempt restart',
    });
  } else if (stale) {
    addLog({
      timestamp: now,
      level: 'warning',
      category: 'gps',
      message: `GPS data is stale (${Math.floor((now - lastUpdate!) / 1000)}s old)`,
      action: 'Will attempt restart',
    });
  }
};

const checkMBTAHealth = (): void => {
  const mbtaStore = useMBTAStore.getState();
  const now = Date.now();

  const lastUpdate = mbtaStore.lastUpdate;
  const stale = lastUpdate ? now - lastUpdate > MBTA_STALE_THRESHOLD_MS : true;
  const hasTripPlan = lastTripPlan !== null && lastTripPlan.legs.length > 0;

  supervisorState.health.mbta = {
    polling: !stale,
    stale,
    lastUpdate,
    hasTripPlan,
  };

  // Log issues
  if (hasTripPlan && stale) {
    addLog({
      timestamp: now,
      level: 'warning',
      category: 'mbta',
      message: `MBTA data is stale (${Math.floor((now - (lastUpdate || now)) / 1000)}s old)`,
      action: 'Will trigger refresh',
    });
  }
};

const checkTripPlanHealth = (): void => {
  const now = Date.now();
  
  if (!lastTripPlan) {
    supervisorState.health.tripPlan = { valid: false, hasLegs: false, idsPresent: false };
    return;
  }

  const hasLegs = lastTripPlan.legs.length > 0;
  const idsPresent = lastTripPlan.legs.every(
    (leg) => leg.routeId && leg.fromStopId && leg.toStopId
  );
  const valid = hasLegs && idsPresent;

  supervisorState.health.tripPlan = { valid, hasLegs, idsPresent };

  // Log issues
  if (!valid) {
    if (!hasLegs) {
      addLog({
        timestamp: now,
        level: 'error',
        category: 'tripPlan',
        message: 'TripPlan has no legs',
        action: 'Will regenerate if destination available',
      });
    } else if (!idsPresent) {
      addLog({
        timestamp: now,
        level: 'error',
        category: 'tripPlan',
        message: 'TripPlan has missing route/stop IDs',
        action: 'Will regenerate if destination available',
      });
    }
  }
};

const checkTasksHealth = (): void => {
  const now = Date.now();
  const count = lastTasks.length;
  
  // Tasks are synced if we have a trip plan and tasks exist
  const expectedTaskCount = lastTripPlan ? lastTripPlan.legs.length * 3 : 0; // ~3 tasks per leg
  const synced = count > 0 && lastTripPlan !== null;

  supervisorState.health.tasks = { synced, count };

  // Log issues
  if (lastTripPlan && count === 0) {
    addLog({
      timestamp: now,
      level: 'warning',
      category: 'tasks',
      message: 'No tasks generated despite having TripPlan',
      action: 'Will regenerate tasks',
    });
  } else if (!lastTripPlan && count > 0) {
    addLog({
      timestamp: now,
      level: 'warning',
      category: 'tasks',
      message: 'Tasks exist but no TripPlan',
      action: 'Tasks are orphaned',
    });
  }
};

// Auto-corrections
const autoCorrectGPS = async (): Promise<void> => {
  if (!callbacks?.restartGPS) return;

  const { active, valid, stale } = supervisorState.health.gps;
  
  if (!active || !valid || stale) {
    const issue = !active ? 'GPS not active' : !valid ? 'Invalid GPS coords' : 'Stale GPS data';
    
    try {
      await callbacks.restartGPS();
      addAutoFix({
        timestamp: Date.now(),
        category: 'gps',
        issue,
        action: 'Restarted GPS tracking',
        success: true,
      });
    } catch (error) {
      addAutoFix({
        timestamp: Date.now(),
        category: 'gps',
        issue,
        action: 'Attempted GPS restart',
        success: false,
      });
    }
  }
};

const autoCorrectMBTA = async (): Promise<void> => {
  if (!callbacks?.refreshMBTA) return;

  const { stale, hasTripPlan } = supervisorState.health.mbta;
  
  if (hasTripPlan && stale) {
    try {
      await callbacks.refreshMBTA();
      addAutoFix({
        timestamp: Date.now(),
        category: 'mbta',
        issue: 'Stale MBTA data',
        action: 'Triggered immediate refresh',
        success: true,
      });
    } catch (error) {
      addAutoFix({
        timestamp: Date.now(),
        category: 'mbta',
        issue: 'Stale MBTA data',
        action: 'Attempted MBTA refresh',
        success: false,
      });
    }
  }
};

const autoCorrectTripPlan = async (): Promise<void> => {
  if (!callbacks?.regenerateTripPlan || !lastDestinationStopId) return;

  const { valid } = supervisorState.health.tripPlan;
  
  if (!valid && lastDestinationStopId) {
    try {
      await callbacks.regenerateTripPlan(lastDestinationStopId);
      addAutoFix({
        timestamp: Date.now(),
        category: 'tripPlan',
        issue: 'Invalid TripPlan',
        action: 'Regenerated trip plan',
        success: true,
      });
    } catch (error) {
      addAutoFix({
        timestamp: Date.now(),
        category: 'tripPlan',
        issue: 'Invalid TripPlan',
        action: 'Attempted trip plan regeneration',
        success: false,
      });
    }
  }
};

const autoCorrectTasks = async (): Promise<void> => {
  if (!callbacks?.regenerateTasks || !lastTripPlan) return;

  const { synced } = supervisorState.health.tasks;
  
  if (!synced && lastTripPlan) {
    try {
      await callbacks.regenerateTasks(lastTripPlan, true);
      addAutoFix({
        timestamp: Date.now(),
        category: 'tasks',
        issue: 'Tasks desynced',
        action: 'Regenerated tasks (preserved completed)',
        success: true,
      });
    } catch (error) {
      addAutoFix({
        timestamp: Date.now(),
        category: 'tasks',
        issue: 'Tasks desynced',
        action: 'Attempted task regeneration',
        success: false,
      });
    }
  }
};

// Main supervisor loop
const runHealthChecks = async (): Promise<void> => {
  checkGPSHealth();
  checkMBTAHealth();
  checkTripPlanHealth();
  checkTasksHealth();
};

const runAutoCorrections = async (): Promise<void> => {
  await autoCorrectGPS();
  await autoCorrectMBTA();
  await autoCorrectTripPlan();
  await autoCorrectTasks();
};

const supervisorLoop = async (): Promise<void> => {
  await runHealthChecks();
  await runAutoCorrections();
};

// Public API
export const startSupervisor = (supervisorCallbacks: SupervisorCallbacks): void => {
  if (supervisorState.isRunning) {
    console.log('[Supervisor] Already running');
    return;
  }

  callbacks = supervisorCallbacks;
  supervisorState.isRunning = true;

  console.log(`[Supervisor] 🚀 Starting health monitoring (every ${SUPERVISOR_INTERVAL_MS}ms)`);

  // Run immediately
  supervisorLoop();

  // Set up interval
  supervisorInterval = setInterval(() => {
    supervisorLoop();
  }, SUPERVISOR_INTERVAL_MS);
};

export const stopSupervisor = (): void => {
  if (supervisorInterval) {
    clearInterval(supervisorInterval);
    supervisorInterval = null;
  }

  supervisorState.isRunning = false;
  console.log('[Supervisor] 🛑 Stopped');
};

export const updateTripPlan = (tripPlan: TripPlan | null, destinationStopId: string | null): void => {
  lastTripPlan = tripPlan;
  lastDestinationStopId = destinationStopId;
};

export const updateTasks = (tasks: GameTask[]): void => {
  lastTasks = tasks;
};

export const getSupervisorState = (): SupervisorState => {
  return supervisorState;
};

export const clearLogs = (): void => {
  supervisorState.errors = [];
  supervisorState.warnings = [];
  supervisorState.lastAutoFix = [];
  console.log('[Supervisor] Logs cleared');
};
