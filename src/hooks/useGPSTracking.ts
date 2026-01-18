// GPS Tracking Hook with Auto-Recovery
// Provides live GPS position with automatic stale detection and recovery

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LatLng, GPSStatus, Result } from '../types/mbta';

interface GPSState {
  position: LatLng | null;
  heading: number | null;
  accuracy: number | null;
  status: GPSStatus;
  lastUpdate: number | null;
  error: string | null;
}

interface UseGPSOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  staleThreshold?: number; // Milliseconds before position considered stale
}

const DEFAULT_OPTIONS: Required<UseGPSOptions> = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
  staleThreshold: 10000 // 10 seconds
};

export function useGPSTracking(options: UseGPSOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [gpsState, setGPSState] = useState<GPSState>({
    position: null,
    heading: null,
    accuracy: null,
    status: 'INITIALIZING',
    lastUpdate: null,
    error: null
  });

  const watchIdRef = useRef<number | null>(null);
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if position is stale
  const checkStale = useCallback(() => {
    setGPSState(prev => {
      if (!prev.lastUpdate) return prev;
      
      const age = Date.now() - prev.lastUpdate;
      if (age > opts.staleThreshold && prev.status === 'OK') {
        console.warn(`[GPS] Position stale (${age}ms old), restarting watcher...`);
        return {
          ...prev,
          status: 'STALE'
        };
      }
      
      return prev;
    });
  }, [opts.staleThreshold]);

  // Start GPS watching
  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      console.error('[GPS] Geolocation not supported');
      setGPSState(prev => ({
        ...prev,
        status: 'DENIED',
        error: 'Geolocation not supported'
      }));
      return;
    }

    console.log('[GPS] Starting watch...');
    setGPSState(prev => ({ ...prev, status: 'INITIALIZING' }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition: LatLng = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        setGPSState({
          position: newPosition,
          heading: position.coords.heading,
          accuracy: position.coords.accuracy,
          status: 'OK',
          lastUpdate: Date.now(),
          error: null
        });

        console.log(`[GPS] Position updated: ${newPosition.latitude.toFixed(6)}, ${newPosition.longitude.toFixed(6)}`);
      },
      (error) => {
        let errorMsg = 'Unknown error';
        let status: GPSStatus = 'DENIED';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission denied';
            status = 'DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location unavailable';
            status = 'STALE';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timeout';
            status = 'STALE';
            break;
        }

        console.error(`[GPS] Error: ${errorMsg}`);
        setGPSState(prev => ({
          ...prev,
          status,
          error: errorMsg
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout
      }
    );

    watchIdRef.current = watchId;
  }, [opts.enableHighAccuracy, opts.maximumAge, opts.timeout]);

  // Stop GPS watching
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[GPS] Stopping watch...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Restart watcher (self-correction)
  const restartWatcher = useCallback(() => {
    console.log('[GPS] Restarting watcher for auto-recovery...');
    stopWatching();
    setTimeout(() => startWatching(), 1000); // Brief delay before restart
  }, [stopWatching, startWatching]);

  // Initialize and cleanup
  useEffect(() => {
    startWatching();

    // Set up stale check interval
    staleCheckIntervalRef.current = setInterval(checkStale, 5000) as unknown as NodeJS.Timeout; // Check every 5s

    return () => {
      stopWatching();
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [startWatching, stopWatching, checkStale]);

  // Auto-restart when stale detected
  useEffect(() => {
    if (gpsState.status === 'STALE' && watchIdRef.current !== null) {
      restartWatcher();
    }
  }, [gpsState.status, restartWatcher]);

  // Fallback to Boston Center if GPS fails or is denied
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gpsState.status === 'ERROR' || (gpsState.status === 'INITIALIZING' && !gpsState.position)) {
       timer = setTimeout(() => {
          console.warn("[GPS] Location not found, falling back to Boston default.");
          setGPSState(prev => ({
            ...prev,
            position: { lat: 42.3601, lng: -71.0589 }, // Boston Common
            status: 'LIVE', // Fake live status for gameplay
            error: 'Using Default Location'
          }));
       }, 5000); // Wait 5s before fallback
    }
    return () => clearTimeout(timer);
  }, [gpsState.status, gpsState.position]);

  return {
    position: gpsState.position,
    heading: gpsState.heading,
    accuracy: gpsState.accuracy,
    status: gpsState.status,
    lastUpdate: gpsState.lastUpdate,
    error: gpsState.error,
    restart: restartWatcher
  };
}

// Utility to get single position (one-shot)
export async function getCurrentPosition(options: UseGPSOptions = {}): Promise<Result<LatLng>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!('geolocation' in navigator)) {
    return {
      success: false,
      error: 'Geolocation not supported'
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      },
      (error) => {
        let errorMsg = 'Failed to get position';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Position unavailable';
            break;
          case error.TIMEOUT:
            errorMsg = 'Request timeout';
            break;
        }
        resolve({
          success: false,
          error: errorMsg
        });
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout
      }
    );
  });
}
