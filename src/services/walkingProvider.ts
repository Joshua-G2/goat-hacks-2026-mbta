// Walking Provider Abstraction
// Provides walking estimates with fallback from SerpAPI to heuristic

import type { LatLng, WalkingEstimate, Result } from '../types/mbta';

// Abstract provider interface
export interface WalkingProvider {
  getWalkingEstimate(from: LatLng, to: LatLng): Promise<Result<WalkingEstimate>>;
  getProviderName(): string;
}

// Cache for walking estimates
class WalkingCache {
  private cache = new Map<string, { estimate: WalkingEstimate; expires: number }>();
  private TTL = 10 * 60 * 1000; // 10 minutes

  private getCacheKey(from: LatLng, to: LatLng): string {
    // Round to 4 decimals (~11 meters precision)
    const fromKey = `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}`;
    const toKey = `${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
    return `${fromKey}->${toKey}`;
  }

  get(from: LatLng, to: LatLng): WalkingEstimate | null {
    const key = this.getCacheKey(from, to);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expires) {
      return cached.estimate;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  set(from: LatLng, to: LatLng, estimate: WalkingEstimate): void {
    const key = this.getCacheKey(from, to);
    this.cache.set(key, {
      estimate,
      expires: Date.now() + this.TTL
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// SerpAPI provider using Google Maps Directions (walking mode)
export class SerpApiWalkingProvider implements WalkingProvider {
  private apiKey: string;
  private cache = new WalkingCache();
  private baseUrl = 'https://serpapi.com/search.json';
  private retryDelay = 1000;

  constructor(apiKey: string = '9cb0697fe9c9a486aa35158b4226eb85e4679dd3513b4d467713b26ade26b4a4') {
    this.apiKey = apiKey;
  }

  getProviderName(): string {
    return 'SerpAPI';
  }

  async getWalkingEstimate(from: LatLng, to: LatLng): Promise<Result<WalkingEstimate>> {
    // Self-check: validate coordinates
    if (!this.validateCoordinates(from) || !this.validateCoordinates(to)) {
      return {
        success: false,
        error: 'Invalid coordinates provided',
        retryable: false
      };
    }

    // Check cache first
    const cached = this.cache.get(from, to);
    if (cached) {
      return { success: true, data: cached };
    }

    // Try request with retry
    let result = await this.makeRequest(from, to);
    
    // Self-correct: retry once with backoff if failed
    if (!result.success && result.retryable) {
      console.log(`[SerpAPI] First attempt failed, retrying after ${this.retryDelay}ms...`);
      await this.delay(this.retryDelay);
      result = await this.makeRequest(from, to);
    }

    // Cache successful results
    if (result.success) {
      this.cache.set(from, to, result.data);
    }

    return result;
  }

  private async makeRequest(from: LatLng, to: LatLng): Promise<Result<WalkingEstimate>> {
    try {
      const params = new URLSearchParams({
        engine: 'google_maps_directions',
        api_key: this.apiKey,
        origin: `${from.latitude},${from.longitude}`,
        destination: `${to.latitude},${to.longitude}`,
        travel_mode: 'walking'
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        const isRateLimit = response.status === 429;
        console.error(`[SerpAPI] HTTP ${response.status}: ${response.statusText}`);
        return {
          success: false,
          error: isRateLimit ? 'Rate limit exceeded' : `HTTP ${response.status}`,
          retryable: !isRateLimit
        };
      }

      const data = await response.json();

      // Self-check: validate response structure
      const validation = this.validateResponse(data);
      if (!validation.valid) {
        console.error('[SerpAPI] Invalid response:', validation.reason);
        return {
          success: false,
          error: validation.reason,
          retryable: false
        };
      }

      // Parse walking data from first route's first leg
      const leg = data.routes[0].legs[0];
      const distanceMeters = leg.distance.value;
      const durationSeconds = leg.duration.value;

      // Self-check: validate extracted numbers
      if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
        console.error('[SerpAPI] Invalid distance/duration values');
        return {
          success: false,
          error: 'Invalid numeric values in response',
          retryable: false
        };
      }

      const estimate: WalkingEstimate = {
        distanceMeters,
        durationSeconds,
        source: 'serpapi',
        timestamp: Date.now()
      };

      console.log(`[SerpAPI] Success: ${distanceMeters}m, ${durationSeconds}s`);
      return { success: true, data: estimate };

    } catch (error) {
      console.error('[SerpAPI] Request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
    }
  }

  private validateCoordinates(coords: LatLng): boolean {
    const { latitude, longitude } = coords;
    
    // Boston area bounds (very generous)
    const isLatValid = latitude >= 40 && latitude <= 44;
    const isLngValid = longitude >= -73 && longitude <= -69;
    
    return isLatValid && isLngValid && 
           Number.isFinite(latitude) && 
           Number.isFinite(longitude);
  }

  private validateResponse(data: any): { valid: boolean; reason: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, reason: 'Response is not an object' };
    }

    if (data.error) {
      return { valid: false, reason: `API error: ${data.error}` };
    }

    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
      return { valid: false, reason: 'No routes in response' };
    }

    const route = data.routes[0];
    if (!route.legs || !Array.isArray(route.legs) || route.legs.length === 0) {
      return { valid: false, reason: 'No legs in first route' };
    }

    const leg = route.legs[0];
    if (!leg.distance || !leg.duration) {
      return { valid: false, reason: 'Missing distance or duration in leg' };
    }

    if (typeof leg.distance.value !== 'number' || typeof leg.duration.value !== 'number') {
      return { valid: false, reason: 'Distance/duration values are not numbers' };
    }

    return { valid: true, reason: '' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Heuristic fallback provider (intentional design, not broken)
export class HeuristicWalkingProvider implements WalkingProvider {
  private cache = new WalkingCache();
  
  // Configurable walk speed (meters/second)
  private readonly BASE_WALK_SPEED = 1.4; // ~5 km/h, conservative
  private readonly MIN_WALK_SPEED = 0.8; // Safety floor
  
  // Distance inflation to account for non-straight paths
  private readonly DISTANCE_MULTIPLIER = 1.25; // 25% inflation
  
  // Station complexity penalties (seconds)
  private readonly STATION_PENALTIES = {
    normal: 60,      // Regular stop
    major: 90,       // Major transfer hubs
    complex: 120     // Very complex stations
  };

  // Major transfer hubs in Boston
  private readonly MAJOR_HUBS = [
    'place-pktrm',  // Park Street
    'place-dwnxg',  // Downtown Crossing
    'place-gover',  // Government Center
    'place-state',  // State
    'place-haecl'   // Haymarket
  ];

  getProviderName(): string {
    return 'Heuristic';
  }

  async getWalkingEstimate(from: LatLng, to: LatLng): Promise<Result<WalkingEstimate>> {
    // Self-check: validate coordinates
    if (!this.validateCoordinates(from) || !this.validateCoordinates(to)) {
      console.error('[Heuristic] Invalid coordinates');
      return {
        success: false,
        error: 'Invalid coordinates for heuristic calculation',
        retryable: false
      };
    }

    // Check cache
    const cached = this.cache.get(from, to);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      // Compute straight-line distance using Haversine
      const straightLineMeters = this.haversineDistance(from, to);
      
      // Inflate distance to account for actual walking paths
      const inflatedDistance = straightLineMeters * this.DISTANCE_MULTIPLIER;
      
      // Calculate base duration using walk speed
      const walkSpeed = Math.max(this.BASE_WALK_SPEED, this.MIN_WALK_SPEED);
      const baseDuration = inflatedDistance / walkSpeed;
      
      // Add station complexity penalty
      // For demo purposes, use normal penalty; in production would check stopId
      const stationPenalty = this.STATION_PENALTIES.normal;
      
      const totalDurationSeconds = Math.round(baseDuration + stationPenalty);
      const distanceMeters = Math.round(inflatedDistance);

      const estimate: WalkingEstimate = {
        distanceMeters,
        durationSeconds: totalDurationSeconds,
        source: 'estimated',
        timestamp: Date.now()
      };

      console.log(`[Heuristic] Estimate: ${distanceMeters}m, ${totalDurationSeconds}s (penalty: ${stationPenalty}s)`);
      
      // Cache the result
      this.cache.set(from, to, estimate);
      
      return { success: true, data: estimate };

    } catch (error) {
      console.error('[Heuristic] Calculation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
        retryable: false
      };
    }
  }

  private validateCoordinates(coords: LatLng): boolean {
    const { latitude, longitude } = coords;
    return Number.isFinite(latitude) && 
           Number.isFinite(longitude) &&
           Math.abs(latitude) <= 90 &&
           Math.abs(longitude) <= 180;
  }

  private haversineDistance(from: LatLng, to: LatLng): number {
    const R = 6371000; // Earth radius in meters
    const φ1 = this.toRadians(from.latitude);
    const φ2 = this.toRadians(to.latitude);
    const Δφ = this.toRadians(to.latitude - from.latitude);
    const Δλ = this.toRadians(to.longitude - from.longitude);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}

// Circuit breaker for managing provider failover
export class WalkingProviderManager {
  private serpProvider: SerpApiWalkingProvider;
  private heuristicProvider: HeuristicWalkingProvider;
  
  private consecutiveFailures = 0;
  private fallbackUntil = 0;
  private readonly FAILURE_THRESHOLD = 2;
  private readonly FALLBACK_DURATION = 60000; // 60 seconds

  constructor(serpApiKey: string) {
    this.serpProvider = new SerpApiWalkingProvider(serpApiKey);
    this.heuristicProvider = new HeuristicWalkingProvider();
  }

  async getWalkingEstimate(from: LatLng, to: LatLng): Promise<Result<WalkingEstimate>> {
    const now = Date.now();
    
    // Check if we're in fallback mode
    if (now < this.fallbackUntil) {
      console.log('[WalkManager] In fallback mode, using heuristic');
      return this.heuristicProvider.getWalkingEstimate(from, to);
    }

    // Try SerpAPI first
    const result = await this.serpProvider.getWalkingEstimate(from, to);
    
    if (result.success) {
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      return result;
    }

    // Track failures
    this.consecutiveFailures++;
    console.warn(`[WalkManager] SerpAPI failure ${this.consecutiveFailures}/${this.FAILURE_THRESHOLD}`);
    
    // Enter fallback mode if threshold reached
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.fallbackUntil = now + this.FALLBACK_DURATION;
      console.log(`[WalkManager] Entering fallback mode for ${this.FALLBACK_DURATION/1000}s to prevent thrash`);
    }
    
    // Use heuristic as fallback
    console.log('[WalkManager] SerpAPI unavailable → using Estimated walk model');
    return this.heuristicProvider.getWalkingEstimate(from, to);
  }

  getCurrentSource(): 'SERPAPI' | 'ESTIMATED' {
    return Date.now() < this.fallbackUntil ? 'ESTIMATED' : 'SERPAPI';
  }

  resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
    this.fallbackUntil = 0;
  }
}
