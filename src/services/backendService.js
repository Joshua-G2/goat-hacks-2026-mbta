/**
 * Backend Integration Service
 * 
 * Handles communication with backend for:
 * - Real-time user locations
 * - Event reporting and broadcasting
 * - User profiles and game data persistence
 * 
 * Supports both Firebase and Supabase backends
 */

// Configuration - choose your backend
const BACKEND_TYPE = import.meta.env.VITE_BACKEND_TYPE || 'none'; // 'firebase', 'supabase', or 'none'

/**
 * Mock Backend Service (for development without actual backend)
 */
class MockBackendService {
  constructor() {
    this.users = new Map();
    this.events = [];
    this.locations = new Map();
    this.subscriptions = new Map();
  }

  async saveUserProfile(user) {
    this.users.set(user.uid, user);
    return { success: true };
  }

  async getUserProfile(userId) {
    return this.users.get(userId) || null;
  }

  async updateUserLocation(userId, location) {
    this.locations.set(userId, { userId, ...location, timestamp: Date.now() });
    this._notifySubscribers('locations', Array.from(this.locations.values()));
    return { success: true };
  }

  subscribeToLocations(callback) {
    const id = Math.random().toString(36);
    if (!this.subscriptions.has('locations')) {
      this.subscriptions.set('locations', new Map());
    }
    this.subscriptions.get('locations').set(id, callback);
    
    // Initial callback with current data
    callback(Array.from(this.locations.values()));
    
    return () => {
      this.subscriptions.get('locations')?.delete(id);
    };
  }

  async sendEvent(eventData) {
    const event = { ...eventData, id: `event_${Date.now()}` };
    this.events.push(event);
    this._notifySubscribers('events', event);
    return { success: true, event };
  }

  subscribeToEvents(callback) {
    const id = Math.random().toString(36);
    if (!this.subscriptions.has('events')) {
      this.subscriptions.set('events', new Map());
    }
    this.subscriptions.get('events').set(id, callback);
    
    return () => {
      this.subscriptions.get('events')?.delete(id);
    };
  }

  _notifySubscribers(channel, data) {
    const subs = this.subscriptions.get(channel);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }
}

/**
 * Firebase Backend Service
 * 
 * Uncomment and configure if using Firebase:
 * npm install firebase
 */
class FirebaseBackendService {
  constructor() {
    // import { initializeApp } from 'firebase/app';
    // import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc } from 'firebase/firestore';
    // import { getAuth } from 'firebase/auth';
    
    // const firebaseConfig = {
    //   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    //   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    //   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    //   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    //   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    //   appId: import.meta.env.VITE_FIREBASE_APP_ID
    // };
    
    // this.app = initializeApp(firebaseConfig);
    // this.db = getFirestore(this.app);
    // this.auth = getAuth(this.app);
    
    console.warn('Firebase service not configured');
  }

  async saveUserProfile(user) {
    // const userRef = doc(this.db, 'users', user.uid);
    // await setDoc(userRef, user);
    return { success: false, error: 'Not configured' };
  }

  async updateUserLocation(userId, location) {
    // const locationRef = doc(this.db, 'locations', userId);
    // await setDoc(locationRef, { userId, ...location, timestamp: Date.now() });
    return { success: false, error: 'Not configured' };
  }

  subscribeToLocations(callback) {
    // const locationsRef = collection(this.db, 'locations');
    // return onSnapshot(locationsRef, (snapshot) => {
    //   const locations = snapshot.docs.map(doc => doc.data());
    //   callback(locations);
    // });
    return () => {};
  }

  async sendEvent(eventData) {
    // const eventsRef = collection(this.db, 'events');
    // const docRef = await addDoc(eventsRef, eventData);
    // return { success: true, event: { id: docRef.id, ...eventData } };
    return { success: false, error: 'Not configured' };
  }

  subscribeToEvents(callback) {
    // const eventsRef = collection(this.db, 'events');
    // return onSnapshot(eventsRef, (snapshot) => {
    //   snapshot.docChanges().forEach((change) => {
    //     if (change.type === 'added') {
    //       callback({ id: change.doc.id, ...change.doc.data() });
    //     }
    //   });
    // });
    return () => {};
  }
}

/**
 * Supabase Backend Service
 * 
 * Uncomment and configure if using Supabase:
 * npm install @supabase/supabase-js
 */
class SupabaseBackendService {
  constructor() {
    // import { createClient } from '@supabase/supabase-js';
    
    // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    // const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    // this.supabase = createClient(supabaseUrl, supabaseKey);
    
    console.warn('Supabase service not configured');
  }

  async saveUserProfile(user) {
    // const { data, error } = await this.supabase
    //   .from('users')
    //   .upsert(user);
    // return { success: !error, data, error };
    return { success: false, error: 'Not configured' };
  }

  async updateUserLocation(userId, location) {
    // const { data, error } = await this.supabase
    //   .from('locations')
    //   .upsert({ user_id: userId, ...location, timestamp: new Date() });
    // return { success: !error, data, error };
    return { success: false, error: 'Not configured' };
  }

  subscribeToLocations(callback) {
    // const channel = this.supabase.channel('locations-all');
    // channel
    //   .on('postgres_changes', 
    //     { event: '*', schema: 'public', table: 'locations' }, 
    //     async (payload) => {
    //       const { data } = await this.supabase.from('locations').select('*');
    //       callback(data || []);
    //     }
    //   )
    //   .subscribe();
    // return () => this.supabase.removeChannel(channel);
    return () => {};
  }

  async sendEvent(eventData) {
    // const { data, error } = await this.supabase
    //   .from('events')
    //   .insert(eventData)
    //   .select();
    // return { success: !error, event: data?.[0], error };
    return { success: false, error: 'Not configured' };
  }

  subscribeToEvents(callback) {
    // const channel = this.supabase.channel('events-all');
    // channel
    //   .on('postgres_changes', 
    //     { event: 'INSERT', schema: 'public', table: 'events' }, 
    //     (payload) => {
    //       callback(payload.new);
    //     }
    //   )
    //   .subscribe();
    // return () => this.supabase.removeChannel(channel);
    return () => {};
  }
}

/**
 * Get the configured backend service
 */
function getBackendService() {
  switch (BACKEND_TYPE) {
    case 'firebase':
      return new FirebaseBackendService();
    case 'supabase':
      return new SupabaseBackendService();
    default:
      return new MockBackendService();
  }
}

// Export singleton instance
export const backendService = getBackendService();

/**
 * Higher-level API functions
 */

export async function saveUserProfile(user) {
  return backendService.saveUserProfile(user);
}

export async function getUserProfile(userId) {
  return backendService.getUserProfile(userId);
}

export async function updateUserLocation(userId, location) {
  return backendService.updateUserLocation(userId, location);
}

export function subscribeToUserLocations(callback) {
  return backendService.subscribeToLocations(callback);
}

export async function reportEvent(eventData) {
  return backendService.sendEvent(eventData);
}

export function subscribeToEvents(callback) {
  return backendService.subscribeToEvents(callback);
}

/**
 * User authentication (placeholder)
 * In production, integrate with Firebase Auth or Supabase Auth
 */
export async function signInUser(email, password) {
  // Placeholder - implement with actual auth
  return {
    success: true,
    user: {
      uid: 'demo_user_' + Date.now(),
      email,
      displayName: 'Demo User',
    }
  };
}

export async function signUpUser(email, password, displayName) {
  // Placeholder - implement with actual auth
  return {
    success: true,
    user: {
      uid: 'demo_user_' + Date.now(),
      email,
      displayName,
    }
  };
}

export async function signOutUser() {
  // Placeholder - implement with actual auth
  return { success: true };
}

export default backendService;
