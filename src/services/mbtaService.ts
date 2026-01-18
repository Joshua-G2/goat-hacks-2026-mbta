// MBTA API Service - Source of Transit Truth
// Polls live data: /stops, /routes, /shapes, /vehicles, /predictions
// Falls back to /schedules only when predictions unavailable

import type {
  LatLng,
  MBTAStop,
  MBTARoute,
  MBTAVehicle,
  MBTAPrediction,
  MBTAShape,
  MBTASchedule,
  MBTAResponse,
  MBTAStatus,
  Result
} from '../types/mbta';

const MBTA_API_BASE = 'https://api-v3.mbta.com';
const MBTA_API_KEY = 'e6d82008f5c44c6c9906ca613361e366'; // Your API key

class MBTAService {
  private lastSuccessfulFetch = 0;
  private readonly STALE_THRESHOLD = 30000; // 30 seconds

  // Get current API status
  getStatus(): MBTAStatus {
    const age = Date.now() - this.lastSuccessfulFetch;
    if (this.lastSuccessfulFetch === 0) return 'ERROR';
    if (age > this.STALE_THRESHOLD) return 'STALE';
    return 'LIVE';
  }

  // Generic fetch with retry
  private async fetchWithRetry<T>(
    endpoint: string,
    params: Record<string, string> = {},
    retryCount = 1
  ): Promise<Result<MBTAResponse<T>>> {
    const url = new URL(`${MBTA_API_BASE}${endpoint}`);
    url.searchParams.append('api_key', MBTA_API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MBTAResponse<T> = await response.json();
      this.lastSuccessfulFetch = Date.now();
      
      return { success: true, data };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MBTA] ${endpoint} failed:`, errorMsg);

      // Retry logic
      if (retryCount > 0) {
        console.log(`[MBTA] Retrying ${endpoint}...`);
        await this.delay(1000);
        return this.fetchWithRetry(endpoint, params, retryCount - 1);
      }

      return {
        success: false,
        error: errorMsg,
        retryable: true
      };
    }
  }

  // Search stops by name
  async searchStops(query: string, limit = 20): Promise<Result<MBTAStop[]>> {
    const result = await this.fetchWithRetry<MBTAStop[]>('/stops', {
      'filter[name]': query,
      'filter[route_type]': '0,1', // Light rail and heavy rail only
      'page[limit]': limit.toString()
    });

    if (!result.success) return result;

    const stops = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: stops as MBTAStop[] };
  }

  // Get stops near location
  async getStopsNear(location: LatLng, radiusMeters = 500): Promise<Result<MBTAStop[]>> {
    const result = await this.fetchWithRetry<MBTAStop[]>('/stops', {
      'filter[latitude]': location.latitude.toFixed(6),
      'filter[longitude]': location.longitude.toFixed(6),
      'filter[radius]': (radiusMeters / 1000).toFixed(3), // Convert to km
      'filter[route_type]': '0,1'
    });

    if (!result.success) return result;

    const stops = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: stops as MBTAStop[] };
  }

  // Get route information
  async getRoute(routeId: string): Promise<Result<MBTARoute>> {
    const result = await this.fetchWithRetry<MBTARoute>(`/routes/${routeId}`);

    if (!result.success) return result;

    const route = Array.isArray(result.data.data) ? result.data.data[0] : result.data.data;
    return { success: true, data: route };
  }

  // Get all subway routes
  async getSubwayRoutes(): Promise<Result<MBTARoute[]>> {
    const result = await this.fetchWithRetry<MBTARoute[]>('/routes', {
      'filter[type]': '0,1' // Light rail and heavy rail
    });

    if (!result.success) return result;

    const routes = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: routes as MBTARoute[] };
  }

  // Get shape/polyline for route
  async getShape(shapeId: string): Promise<Result<LatLng[]>> {
    const result = await this.fetchWithRetry<MBTAShape>(`/shapes/${shapeId}`);

    if (!result.success) return result;

    const shape = Array.isArray(result.data.data) ? result.data.data[0] : result.data.data;
    
    // Decode polyline
    const points = this.decodePolyline(shape.attributes.polyline);
    return { success: true, data: points };
  }

  // Get vehicles for routes (LIVE data)
  async getVehicles(routeIds: string[]): Promise<Result<MBTAVehicle[]>> {
    if (routeIds.length === 0) {
      return { success: true, data: [] };
    }

    const result = await this.fetchWithRetry<MBTAVehicle[]>('/vehicles', {
      'filter[route]': routeIds.join(','),
      include: 'trip,stop'
    });

    if (!result.success) return result;

    const vehicles = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: vehicles as MBTAVehicle[] };
  }

  // Get predictions for stop and route (LIVE data - PRIMARY)
  async getPredictions(stopId: string, routeId?: string): Promise<Result<MBTAPrediction[]>> {
    const params: Record<string, string> = {
      'filter[stop]': stopId
    };

    if (routeId) {
      params['filter[route]'] = routeId;
    }

    const result = await this.fetchWithRetry<MBTAPrediction[]>('/predictions', params);

    if (!result.success) {
      console.warn(`[MBTA] Predictions unavailable for stop ${stopId}, will fallback to schedules`);
      return result;
    }

    const predictions = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: predictions as MBTAPrediction[] };
  }

  // Get schedules for stop and route (FALLBACK ONLY)
  async getSchedules(stopId: string, routeId: string): Promise<Result<MBTASchedule[]>> {
    console.log(`[MBTA] Using schedule fallback for stop ${stopId}`);
    
    const now = new Date();
    const minTime = now.toISOString();
    const maxTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // Next 2 hours

    const result = await this.fetchWithRetry<MBTASchedule[]>('/schedules', {
      'filter[stop]': stopId,
      'filter[route]': routeId,
      'filter[min_time]': minTime,
      'filter[max_time]': maxTime
    });

    if (!result.success) return result;

    const schedules = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
    return { success: true, data: schedules as MBTASchedule[] };
  }

  // Get predictions with schedule fallback
  async getPredictionsOrSchedules(
    stopId: string,
    routeId: string
  ): Promise<Result<{ predictions: MBTAPrediction[]; source: 'live' | 'scheduled' }>> {
    // Try predictions first
    const predResult = await this.getPredictions(stopId, routeId);
    
    if (predResult.success && predResult.data.length > 0) {
      return {
        success: true,
        data: {
          predictions: predResult.data,
          source: 'live'
        }
      };
    }

    // Fallback to schedules
    const schedResult = await this.getSchedules(stopId, routeId);
    
    if (!schedResult.success) {
      return {
        success: false,
        error: 'Both predictions and schedules unavailable',
        retryable: true
      };
    }

    // Convert schedules to prediction format
    const predictions: MBTAPrediction[] = schedResult.data.map(sched => ({
      id: sched.id,
      type: 'prediction',
      attributes: {
        arrival_time: sched.attributes.arrival_time,
        departure_time: sched.attributes.departure_time,
        direction_id: sched.attributes.direction_id,
        stop_sequence: sched.attributes.stop_sequence
      },
      relationships: sched.relationships
    }));

    return {
      success: true,
      data: {
        predictions,
        source: 'scheduled'
      }
    };
  }

  // Decode Google polyline format
  private decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }

    return points;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const mbtaService = new MBTAService();

// Hook for polling MBTA data
import { useState, useEffect } from 'react';

interface UseMBTAPollingOptions {
  routeIds?: string[];
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useMBTAPolling(options: UseMBTAPollingOptions = {}) {
  const { routeIds = [], interval = 8000, enabled = true } = options;
  
  const [vehicles, setVehicles] = useState<MBTAVehicle[]>([]);
  const [status, setStatus] = useState<MBTAStatus>('ERROR');
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!enabled || routeIds.length === 0) {
      return;
    }

    const poll = async () => {
      const result = await mbtaService.getVehicles(routeIds);
      
      if (result.success) {
        setVehicles(result.data);
        setLastUpdate(Date.now());
      }
      
      setStatus(mbtaService.getStatus());
    };

    // Initial fetch
    poll();

    // Set up polling
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [routeIds.join(','), interval, enabled]);

  return {
    vehicles,
    status,
    lastUpdate
  };
}
