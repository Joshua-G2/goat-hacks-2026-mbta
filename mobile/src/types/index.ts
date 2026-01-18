// MBTA API Response Types

export interface MBTAResource<T = any> {
  data: T;
  included?: any[];
  links?: {
    self?: string;
    next?: string;
    prev?: string;
  };
}

export interface MBTARoute {
  id: string;
  type: 'route';
  attributes: {
    color: string;
    description: string;
    direction_destinations: string[];
    direction_names: string[];
    fare_class: string;
    long_name: string;
    short_name: string;
    sort_order: number;
    text_color: string;
    type: number;
  };
  relationships?: {
    line?: { data: { id: string; type: string } };
  };
}

export interface MBTAStop {
  id: string;
  type: 'stop';
  attributes: {
    address: string | null;
    description: string | null;
    latitude: number;
    longitude: number;
    name: string;
    platform_code: string | null;
    platform_name: string | null;
    wheelchair_boarding: number;
    location_type: number;
  };
}

export interface MBTAPrediction {
  id: string;
  type: 'prediction';
  attributes: {
    arrival_time: string | null;
    departure_time: string | null;
    direction_id: number;
    schedule_relationship: string | null;
    status: string | null;
    stop_sequence: number | null;
  };
  relationships: {
    route: { data: { id: string; type: string } };
    stop: { data: { id: string; type: string } };
    trip: { data: { id: string; type: string } };
    vehicle?: { data: { id: string; type: string } };
  };
}

export interface MBTAVehicle {
  id: string;
  type: 'vehicle';
  attributes: {
    bearing: number | null;
    current_status: string;
    current_stop_sequence: number | null;
    direction_id: number;
    label: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    updated_at: string;
  };
  relationships: {
    route: { data: { id: string; type: string } };
    stop?: { data: { id: string; type: string } };
    trip: { data: { id: string; type: string } };
  };
}

export interface MBTAShape {
  id: string;
  type: 'shape';
  attributes: {
    direction_id: number;
    name: string;
    polyline: string;
    priority: number;
  };
}

export interface MBTAAlert {
  id: string;
  type: 'alert';
  attributes: {
    active_period: Array<{
      start: string;
      end: string | null;
    }>;
    cause: string;
    created_at: string;
    description: string;
    effect: string;
    header: string;
    informed_entity: any[];
    lifecycle: string;
    severity: number;
    short_header: string;
    timeframe: string | null;
    updated_at: string;
    url: string | null;
  };
}

// App-specific types

export interface Location {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  altitude?: number | null;
  accuracy?: number;
  timestamp?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  location: Location;
  xpReward: number;
  distance?: number;
  stationId?: string;
  stationName?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  stationId: string;
  stationName: string;
  reward: number;
  type: string;
  context?: any;
}

export interface GameEvent {
  id: string;
  type: 'POLICE' | 'DELAY' | 'CROWDED' | 'MAINTENANCE' | 'INCIDENT' | 'level_up';
  title?: string;
  description: string;
  location: Location;
  timestamp: number | string;
  userId?: string;
  xpReward?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  xp: number;
  level: number;
  miles: number;
  tasksCompleted: number;
  totalTrips: number;
  position?: Location;
  achievements?: string[];
  badges?: string[];
  stats?: {
    totalDistance?: number;
    totalTime?: number;
    routesUsed?: string[];
    favoriteStation?: string | null;
  };
}
