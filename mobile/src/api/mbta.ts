import axios, { AxiosInstance, AxiosError } from 'axios';
import { ENV } from '@utils/config';
import { exponentialBackoff } from '@utils/helpers';
import type {
  MBTAResource,
  MBTARoute,
  MBTAStop,
  MBTAPrediction,
  MBTAVehicle,
  MBTAShape,
  MBTAAlert,
} from '@types';

/**
 * MBTA API Client with retry logic and exponential backoff
 */
class MBTAApiClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes for routes/shapes/stops

  constructor() {
    this.client = axios.create({
      baseURL: ENV.MBTA_API_BASE_URL,
      headers: {
        'x-api-key': ENV.MBTA_API_KEY,
      },
      timeout: 10000,
    });

    this.cache = new Map();

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (this.shouldRetry(error)) {
          console.warn('Retryable error detected:', error.message);
          throw error; // Let exponentialBackoff handle retry
        }
        throw error;
      }
    );
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limit
  }

  /**
   * Check cache for fresh data
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetch MBTA routes (cached)
   */
  async getRoutes(params?: {
    type?: string[];
    filter?: { [key: string]: string };
  }): Promise<MBTAResource<MBTARoute>> {
    const cacheKey = `routes_${JSON.stringify(params || {})}`;
    const cached = this.getCached<MBTAResource<MBTARoute>>(cacheKey);
    if (cached) return cached;

    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTARoute>>('/routes', { params })
    );

    const data = response.data;
    this.setCache(cacheKey, data);
    console.log(`Fetched ${data.data.length} MBTA routes`);
    return data;
  }

  /**
   * Fetch MBTA stops (cached)
   */
  async getStops(params?: {
    filter?: { [key: string]: string };
    include?: string;
  }): Promise<MBTAResource<MBTAStop>> {
    const cacheKey = `stops_${JSON.stringify(params || {})}`;
    const cached = this.getCached<MBTAResource<MBTAStop>>(cacheKey);
    if (cached) return cached;

    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTAStop>>('/stops', { params })
    );

    const data = response.data;
    this.setCache(cacheKey, data);
    console.log(`Fetched ${data.data.length} MBTA stops`);
    return data;
  }

  /**
   * Fetch MBTA predictions (real-time, not cached)
   */
  async getPredictions(params?: {
    filter?: { [key: string]: string };
    include?: string;
  }): Promise<MBTAResource<MBTAPrediction>> {
    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTAPrediction>>('/predictions', { params })
    );

    return response.data;
  }

  /**
   * Fetch MBTA vehicles (real-time, not cached)
   */
  async getVehicles(params?: {
    filter?: { [key: string]: string };
    include?: string;
  }): Promise<MBTAResource<MBTAVehicle>> {
    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTAVehicle>>('/vehicles', { params })
    );

    return response.data;
  }

  /**
   * Fetch MBTA shapes for route (cached)
   */
  async getShapes(routeId: string): Promise<MBTAResource<MBTAShape>> {
    const cacheKey = `shapes_${routeId}`;
    const cached = this.getCached<MBTAResource<MBTAShape>>(cacheKey);
    if (cached) return cached;

    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTAShape>>('/shapes', {
        params: { filter: { route: routeId } },
      })
    );

    const data = response.data;
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Fetch MBTA alerts (real-time, not cached)
   */
  async getAlerts(params?: {
    filter?: { [key: string]: string };
    include?: string;
  }): Promise<MBTAResource<MBTAAlert>> {
    const response = await exponentialBackoff(() =>
      this.client.get<MBTAResource<MBTAAlert>>('/alerts', { params })
    );

    return response.data;
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('MBTA API cache cleared');
  }
}

export const mbtaApi = new MBTAApiClient();
