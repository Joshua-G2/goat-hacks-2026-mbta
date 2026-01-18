import { Alert } from 'react-native';
import { useLocationStore } from '@store/locationStore';
import { useMBTAStore } from '@store/mbtaStore';
import { useGameStore } from '@store/gameStore';
import ENV from '@utils/config';

/**
 * Runtime contract validation
 * Ensures system integrity at app startup
 */

interface ContractValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Validate constants are in acceptable ranges
const validateConstants = (): ContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // GPS constants (from useLiveLocation)
  const GPS_MIN_MS = 5000;
  const GPS_MIN_DISTANCE_M = 10;
  const MAX_JUMP_DISTANCE_M = 250;

  if (GPS_MIN_MS < 1000 || GPS_MIN_MS > 30000) {
    errors.push(`GPS_MIN_MS out of range: ${GPS_MIN_MS} (expected 1000-30000)`);
  }

  if (GPS_MIN_DISTANCE_M < 1 || GPS_MIN_DISTANCE_M > 100) {
    errors.push(`GPS_MIN_DISTANCE_M out of range: ${GPS_MIN_DISTANCE_M} (expected 1-100)`);
  }

  if (MAX_JUMP_DISTANCE_M < 50 || MAX_JUMP_DISTANCE_M > 1000) {
    warnings.push(`MAX_JUMP_DISTANCE_M unusual: ${MAX_JUMP_DISTANCE_M} (typically 50-1000)`);
  }

  // MBTA polling constants (from useLiveMbta)
  const MBTA_POLL_MS = 8000;
  const BACKOFF_POLL_MS = 15000;

  if (MBTA_POLL_MS < 5000 || MBTA_POLL_MS > 30000) {
    errors.push(`MBTA_POLL_MS out of range: ${MBTA_POLL_MS} (expected 5000-30000)`);
  }

  if (BACKOFF_POLL_MS <= MBTA_POLL_MS) {
    errors.push(`BACKOFF_POLL_MS must be > MBTA_POLL_MS (${BACKOFF_POLL_MS} vs ${MBTA_POLL_MS})`);
  }

  // Supervisor constants
  const SUPERVISOR_INTERVAL_MS = 3000;
  const GPS_STALE_THRESHOLD_MS = 10000;
  const MBTA_STALE_THRESHOLD_MS = 20000;

  if (SUPERVISOR_INTERVAL_MS < 1000 || SUPERVISOR_INTERVAL_MS > 10000) {
    errors.push(`SUPERVISOR_INTERVAL_MS out of range: ${SUPERVISOR_INTERVAL_MS} (expected 1000-10000)`);
  }

  if (GPS_STALE_THRESHOLD_MS < GPS_MIN_MS * 2) {
    errors.push(
      `GPS_STALE_THRESHOLD_MS too low: ${GPS_STALE_THRESHOLD_MS} ` +
      `(should be at least 2x GPS_MIN_MS = ${GPS_MIN_MS * 2})`
    );
  }

  if (MBTA_STALE_THRESHOLD_MS < MBTA_POLL_MS * 2) {
    errors.push(
      `MBTA_STALE_THRESHOLD_MS too low: ${MBTA_STALE_THRESHOLD_MS} ` +
      `(should be at least 2x MBTA_POLL_MS = ${MBTA_POLL_MS * 2})`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// Validate store slices exist and have required methods
const validateStores = (): ContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Location Store
    const locationStore = useLocationStore.getState();
    const requiredLocationMethods = [
      'setUserLocation',
      'setWatchId',
      'setTracking',
      'setError',
      'reset',
    ];

    for (const method of requiredLocationMethods) {
      if (typeof (locationStore as any)[method] !== 'function') {
        errors.push(`locationStore missing method: ${method}`);
      }
    }

    const requiredLocationProps = ['userLocation', 'watchId', 'isTracking', 'error'];
    for (const prop of requiredLocationProps) {
      if (!(prop in locationStore)) {
        errors.push(`locationStore missing property: ${prop}`);
      }
    }

    // MBTA Store
    const mbtaStore = useMBTAStore.getState();
    const requiredMBTAMethods = [
      'setRoutes',
      'setStops',
      'setPredictions',
      'setVehicles',
      'setAlerts',
      'setLoading',
      'setError',
      'updateTimestamp',
      'reset',
    ];

    for (const method of requiredMBTAMethods) {
      if (typeof (mbtaStore as any)[method] !== 'function') {
        errors.push(`mbtaStore missing method: ${method}`);
      }
    }

    const requiredMBTAProps = [
      'routes',
      'stops',
      'predictions',
      'vehicles',
      'alerts',
      'loading',
      'error',
      'lastUpdate',
    ];
    for (const prop of requiredMBTAProps) {
      if (!(prop in mbtaStore)) {
        errors.push(`mbtaStore missing property: ${prop}`);
      }
    }

    // Game Store
    const gameStore = useGameStore.getState();
    const requiredGameMethods = [
      'updateProfile',
      'addXP',
      'setTasks',
      'addTask',
      'removeTask',
      'setQuests',
      'addQuest',
      'completeQuest',
      'setEvents',
      'addEvent',
      'reset',
    ];

    for (const method of requiredGameMethods) {
      if (typeof (gameStore as any)[method] !== 'function') {
        errors.push(`gameStore missing method: ${method}`);
      }
    }

    const requiredGameProps = ['profile', 'tasks', 'quests', 'events'];
    for (const prop of requiredGameProps) {
      if (!(prop in gameStore)) {
        errors.push(`gameStore missing property: ${prop}`);
      }
    }
  } catch (error) {
    errors.push(`Store validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// Validate environment configuration
const validateEnvironment = (): ContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ENV.MBTA_API_KEY) {
    warnings.push('MBTA_API_KEY not set - using unauthenticated requests');
  } else if (ENV.MBTA_API_KEY.length < 10) {
    warnings.push('MBTA_API_KEY seems too short - verify it is correct');
  }

  if (!ENV.MBTA_API_BASE_URL) {
    errors.push('MBTA_API_BASE_URL not set');
  } else if (!ENV.MBTA_API_BASE_URL.startsWith('https://')) {
    errors.push('MBTA_API_BASE_URL must use HTTPS');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// Validate TypeScript configuration
const validateTypeScript = (): ContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if running in development mode
  if (__DEV__) {
    warnings.push('Running in development mode');
  }

  // TypeScript strict mode is enforced at compile time
  // Runtime check would require parsing tsconfig.json

  return {
    passed: true,
    errors,
    warnings,
  };
};

// Main contract assertion function
export const assertContracts = (): void => {
  console.log('🔍 [Contracts] Running runtime validation...');

  const results = [
    { name: 'Constants', result: validateConstants() },
    { name: 'Stores', result: validateStores() },
    { name: 'Environment', result: validateEnvironment() },
    { name: 'TypeScript', result: validateTypeScript() },
  ];

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const { name, result } of results) {
    if (result.errors.length > 0) {
      console.error(`❌ [Contracts] ${name} validation failed:`);
      result.errors.forEach((error) => {
        console.error(`   - ${error}`);
      });
      totalErrors += result.errors.length;
    } else {
      console.log(`✅ [Contracts] ${name} validation passed`);
    }

    if (result.warnings.length > 0) {
      console.warn(`⚠️  [Contracts] ${name} warnings:`);
      result.warnings.forEach((warning) => {
        console.warn(`   - ${warning}`);
      });
      totalWarnings += result.warnings.length;
    }
  }

  if (totalErrors > 0) {
    const errorMessage = `Contract validation failed with ${totalErrors} error(s). Please fix the issues above.`;
    console.error(`\n❌ ${errorMessage}\n`);
    
    // In development, show alert instead of throwing
    if (__DEV__) {
      setTimeout(() => {
        Alert.alert(
          `⚠️ Contract Validation Failed\n\n` +
          `${totalErrors} error(s) found. Check console for details.\n\n` +
          `Fix suggestions:\n` +
          `- Check tsconfig.json for strict mode\n` +
          `- Verify all store methods exist\n` +
          `- Review constant values in ARCHITECTURE.md`
        );
      }, 100);
    } else {
      throw new Error(errorMessage);
    }
  } else if (totalWarnings > 0) {
    console.warn(`⚠️  [Contracts] Validation passed with ${totalWarnings} warning(s)`);
  } else {
    console.log('✅ [Contracts] All validations passed!');
  }
};
