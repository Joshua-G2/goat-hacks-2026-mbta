import { create } from 'zustand';
import type { Task, Quest, GameEvent, UserProfile } from '@types';

interface GameState {
  profile: UserProfile;
  tasks: Task[];
  quests: Quest[];
  events: GameEvent[];
  updateProfile: (updates: Partial<UserProfile>) => void;
  addXP: (amount: number) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  setQuests: (quests: Quest[]) => void;
  addQuest: (quest: Quest) => void;
  completeQuest: (questId: string) => void;
  setEvents: (events: GameEvent[]) => void;
  addEvent: (event: GameEvent) => void;
  reset: () => void;
}

const initialProfile: UserProfile = {
  id: 'user_001',
  username: 'Transit Hero',
  level: 1,
  xp: 0,
  miles: 0,
  tasksCompleted: 0,
  totalTrips: 0,
  achievements: [],
  badges: [],
  stats: {
    totalDistance: 0,
    totalTime: 0,
    routesUsed: [],
    favoriteStation: null,
  },
};

const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 1000) + 1;
};

export const useGameStore = create<GameState>((set) => ({
  profile: initialProfile,
  tasks: [],
  quests: [],
  events: [],
  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),
  addXP: (amount) =>
    set((state) => {
      const newXP = state.profile.xp + amount;
      const newLevel = calculateLevel(newXP);
      const leveledUp = newLevel > state.profile.level;
      
      return {
        profile: {
          ...state.profile,
          xp: newXP,
          level: newLevel,
        },
        events: leveledUp
          ? [
              ...state.events,
              {
                id: `level_up_${Date.now()}`,
                type: 'level_up',
                title: 'Level Up!',
                description: `You reached level ${newLevel}!`,
                timestamp: new Date().toISOString(),
                location: state.profile.stats?.favoriteStation || undefined,
                xpReward: 0,
              },
            ]
          : state.events,
      };
    }),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),
  setQuests: (quests) => set({ quests }),
  addQuest: (quest) =>
    set((state) => ({
      quests: [...state.quests, quest],
    })),
  completeQuest: (questId) =>
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId ? { ...q, completed: true } : q
      ),
    })),
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),
  reset: () =>
    set({
      profile: initialProfile,
      tasks: [],
      quests: [],
      events: [],
    }),
}));
