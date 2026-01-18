import { useEffect, useCallback, useRef } from 'react';
import { mbtaApi } from '@api/mbta';
import { useMBTAStore } from '@store/mbtaStore';
import { useLocationStore } from '@store/locationStore';

/**
 * Custom hook for MBTA data with polling strategy
 * - Routes/Shapes/Stops: cached (fetch once)
 * - Predictions/Vehicles: poll every 5-10s
 */
export const useMBTAData = () => {
  const {
    routes,
    stops,
    predictions,
    vehicles,
    alerts,
    loading,
    error,
    setRoutes,
    setStops,
    setPredictions,
    setVehicles,
    setAlerts,
    setLoading,
    setError,
    updateTimestamp,
  } = useMBTAStore();

  const { userLocation } = useLocationStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch static data (routes, stops) - cached by API client
   */
  const fetchStaticData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [routesData, stopsData] = await Promise.all([
        mbtaApi.getRoutes(),
        mbtaApi.getStops(),
      ]);

      setRoutes(routesData.data);
      setStops(stopsData.data);
      updateTimestamp();

      console.log(`Loaded ${routesData.data.length} routes, ${stopsData.data.length} stops`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch static data';
      setError(errorMessage);
      console.error('Static data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [setRoutes, setStops, setLoading, setError, updateTimestamp]);

  /**
   * Fetch real-time data (predictions, vehicles, alerts)
   */
  const fetchRealTimeData = useCallback(async () => {
    try {
      const params: any = {};
      
      // Filter by nearby location if available
      if (userLocation) {
        params.filter = {
          latitude: userLocation.latitude.toString(),
          longitude: userLocation.longitude.toString(),
          radius: '0.01', // ~1km radius
        };
      }

      const [predictionsData, vehiclesData, alertsData] = await Promise.all([
        mbtaApi.getPredictions(params),
        mbtaApi.getVehicles(params),
        mbtaApi.getAlerts(),
      ]);

      setPredictions(predictionsData.data);
      setVehicles(vehiclesData.data);
      setAlerts(alertsData.data);
      updateTimestamp();

      console.log(
        `Updated: ${predictionsData.data.length} predictions, ${vehiclesData.data.length} vehicles, ${alertsData.data.length} alerts`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch real-time data';
      console.warn('Real-time data fetch error:', errorMessage);
      // Don't set error state for real-time failures - keep polling
    }
  }, [userLocation, setPredictions, setVehicles, setAlerts, updateTimestamp]);

  /**
   * Start polling real-time data every 8 seconds
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    // Immediate fetch
    fetchRealTimeData();

    // Poll every 8 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchRealTimeData();
    }, 8000);

    console.log('Started polling MBTA real-time data');
  }, [fetchRealTimeData]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Stopped polling MBTA real-time data');
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await fetchStaticData();
    await fetchRealTimeData();
  }, [fetchStaticData, fetchRealTimeData]);

  /**
   * Initialize: fetch static data once, start polling real-time
   */
  useEffect(() => {
    fetchStaticData();
    startPolling();

    return () => {
      stopPolling();
    };
  }, []);

  return {
    routes,
    stops,
    predictions,
    vehicles,
    alerts,
    loading,
    error,
    refresh,
    startPolling,
    stopPolling,
  };
};
