import { create } from 'zustand';
import type { MBTARoute, MBTAStop, MBTAPrediction, MBTAVehicle, MBTAAlert } from '@types';

interface MBTAState {
  routes: MBTARoute[];
  stops: MBTAStop[];
  predictions: MBTAPrediction[];
  vehicles: MBTAVehicle[];
  alerts: MBTAAlert[];
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
  setRoutes: (routes: MBTARoute[]) => void;
  setStops: (stops: MBTAStop[]) => void;
  setPredictions: (predictions: MBTAPrediction[]) => void;
  setVehicles: (vehicles: MBTAVehicle[]) => void;
  setAlerts: (alerts: MBTAAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateTimestamp: () => void;
  reset: () => void;
}

export const useMBTAStore = create<MBTAState>((set) => ({
  routes: [],
  stops: [],
  predictions: [],
  vehicles: [],
  alerts: [],
  loading: false,
  error: null,
  lastUpdate: null,
  setRoutes: (routes) => set({ routes }),
  setStops: (stops) => set({ stops }),
  setPredictions: (predictions) => set({ predictions }),
  setVehicles: (vehicles) => set({ vehicles }),
  setAlerts: (alerts) => set({ alerts }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  updateTimestamp: () => set({ lastUpdate: Date.now() }),
  reset: () => set({
    routes: [],
    stops: [],
    predictions: [],
    vehicles: [],
    alerts: [],
    loading: false,
    error: null,
    lastUpdate: null,
  }),
}));
