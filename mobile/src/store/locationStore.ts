import { create } from 'zustand';
import type { Location } from '@types/index';

interface LocationState {
  userLocation: Location | null;
  watchId: number | null;
  isTracking: boolean;
  error: string | null;
  setUserLocation: (location: Location) => void;
  setWatchId: (id: number) => void;
  setTracking: (tracking: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  userLocation: null,
  watchId: null,
  isTracking: false,
  error: null,
  setUserLocation: (location) => set({ userLocation: location }),
  setWatchId: (id) => set({ watchId: id }),
  setTracking: (tracking) => set({ isTracking: tracking }),
  setError: (error) => set({ error }),
  reset: () => set({
    userLocation: null,
    watchId: null,
    isTracking: false,
    error: null,
  }),
}));
