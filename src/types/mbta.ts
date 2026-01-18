// TypeScript Domain Models for MBTA Decision Engine
// Source of truth: MBTA v3 API

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MBTAStop {
  id: string;
  type: 'stop';
  attributes: {
    name: string;
    latitude: number;
    longitude: number;
    platform_code?: string;
    platform_name?: string;
  };
  relationships?: {
    parent_station?: { data?: { id: string } };
  };
}

export interface MBTARoute {
  id: string;
  type: 'route';
  attributes: {
    long_name: string;
    short_name?: string;
    color: string;
    text_color: string;
    direction_destinations: string[];
    type: number; // 0=Light Rail, 1=Heavy Rail, 3=Bus
  };
}

export interface MBTAVehicle {
  id: string;
  type: 'vehicle';
  attributes: {
    bearing?: number;
    current_status: string;
    current_stop_sequence?: number;
    direction_id: 0 | 1;
    latitude?: number;
    longitude?: number;
    speed?: number;
    updated_at: string;
  };
  relationships: {
    route: { data: { id: string } };
    stop?: { data?: { id: string } };
    trip: { data: { id: string } };
  };
}

export interface MBTAPrediction {
  id: string;
  type: 'prediction';
  attributes: {
    arrival_time?: string;
    departure_time?: string;
    direction_id: 0 | 1;
    status?: string;
    stop_sequence?: number;
  };
  relationships: {
    route: { data: { id: string } };
    stop: { data: { id: string } };
    trip: { data: { id: string } };
    vehicle?: { data?: { id: string } };
  };
}

export interface MBTAShape {
  id: string;
  type: 'shape';
  attributes: {
    polyline: string; // Encoded polyline
  };
}

export interface MBTASchedule {
  id: string;
  type: 'schedule';
  attributes: {
    arrival_time?: string;
    departure_time?: string;
    direction_id: 0 | 1;
    stop_sequence: number;
  };
  relationships: {
    route: { data: { id: string } };
    stop: { data: { id: string } };
    trip: { data: { id: string } };
  };
}

// Walking provider models
export interface WalkingEstimate {
  distanceMeters: number;
  durationSeconds: number;
  source: 'serpapi' | 'estimated';
  timestamp: number;
}

export type WalkSource = 'SERPAPI' | 'ESTIMATED';

// Trip planning models
export interface TripLeg {
  routeId: string;
  routeName: string;
  routeColor: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  directionId: 0 | 1;
  polyline?: LatLng[];
}

export interface TransferEvaluation {
  transferStopId: string;
  transferStopName: string;
  leg1ArrivalTime?: string;
  leg2DepartureTime?: string;
  walkDurationSeconds: number;
  walkSource: WalkSource;
  bufferSeconds?: number;
  confidence: 'LIKELY' | 'RISKY' | 'UNLIKELY' | 'UNKNOWN';
  reason: string;
}

export interface TripPlan {
  id: string;
  origin: LatLng;
  destination: MBTAStop;
  legs: TripLeg[];
  transfer?: TransferEvaluation;
  totalDistanceMeters?: number;
  estimatedDurationMinutes?: number;
  lastUpdated: number;
  status: 'VALID' | 'RECOMPUTING' | 'ERROR';
}

// Status tracking
export type GPSStatus = 'OK' | 'STALE' | 'DENIED' | 'INITIALIZING';
export type MBTAStatus = 'LIVE' | 'STALE' | 'ERROR';
export type PlanStatus = 'VALID' | 'RECOMPUTING' | 'NONE';

export interface SystemStatus {
  gps: GPSStatus;
  mbta: MBTAStatus;
  walk: WalkSource;
  plan: PlanStatus;
  lastGPSUpdate?: number;
  lastMBTAUpdate?: number;
}

// Result type for self-correcting services
export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E; retryable?: boolean };

// Service response types
export interface MBTAResponse<T> {
  data: T | T[];
  included?: any[];
  jsonapi: { version: string };
}

export interface SerpAPIDirectionsResponse {
  search_metadata: {
    status: string;
    created_at: string;
  };
  routes?: Array<{
    legs: Array<{
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      steps: any[];
    }>;
  }>;
  error?: string;
}
