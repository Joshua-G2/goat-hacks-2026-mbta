/**
 * Game Utilities
 * 
 * Utility functions for RPG game mode features including XP, levels, 
 * mileage tracking, and rewards.
 */

/**
 * Level Thresholds and Titles
 * Define progression system for RPG mode
 */
export const LEVEL_TABLE = [
  { xp: 0, title: "Newcomer", level: 1 },
  { xp: 100, title: "Rookie Rider", level: 2 },
  { xp: 300, title: "Transit Explorer", level: 3 },
  { xp: 600, title: "Seasoned Commuter", level: 4 },
  { xp: 1000, title: "Conductor", level: 5 },
  { xp: 1500, title: "Line Captain", level: 6 },
  { xp: 2000, title: "Route Master", level: 7 },
  { xp: 3000, title: "Transit Champion", level: 8 },
  { xp: 5000, title: "Transit Master", level: 9 },
  { xp: 7500, title: "System Expert", level: 10 },
  { xp: 10000, title: "Legendary Commuter", level: 11 },
  { xp: 15000, title: "MBTA Guardian", level: 12 },
];

/**
 * Get the title and level for a given XP amount
 * @param {number} xp - Current XP
 * @returns {Object} { title, level, xp, nextLevelXp, progress }
 */
export function getTitleForXp(xp) {
  let currentLevel = LEVEL_TABLE[0];
  let nextLevel = LEVEL_TABLE[1];
  
  for (let i = 0; i < LEVEL_TABLE.length; i++) {
    if (xp >= LEVEL_TABLE[i].xp) {
      currentLevel = LEVEL_TABLE[i];
      nextLevel = LEVEL_TABLE[i + 1] || null;
    } else {
      break;
    }
  }
  
  // Calculate progress to next level
  const progress = nextLevel 
    ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
    : 100;
  
  return {
    title: currentLevel.title,
    level: currentLevel.level,
    xp: currentLevel.xp,
    nextLevelXp: nextLevel?.xp || null,
    progress: Math.min(progress, 100),
  };
}

/**
 * XP Rewards Configuration
 */
export const XP_REWARDS = {
  TASK_COMPLETE: 5,           // XP for completing a task/quest
  MILE_TRAVELED: 1,           // XP per mile traveled
  STATION_VISIT: 2,           // XP for visiting a new station
  SUCCESSFUL_TRANSFER: 3,     // XP for making a successful tight transfer
  ROUTE_COMPLETION: 10,       // XP for traveling entire route
  DAILY_LOGIN: 5,             // XP for daily check-in
  EVENT_REPORT: 2,            // XP for reporting transit events
};

/**
 * Mileage Rewards Configuration
 */
export const MILEAGE_REWARDS = {
  FREE_TICKET_MILES: 100000,  // Miles needed for free ticket reward
  ACHIEVEMENT_MILESTONES: [
    { miles: 100, reward: "First 100 Miles", badge: "🎯" },
    { miles: 500, reward: "Transit Regular", badge: "🚇" },
    { miles: 1000, reward: "Thousand Mile Club", badge: "⭐" },
    { miles: 5000, reward: "Master Navigator", badge: "🏆" },
    { miles: 10000, reward: "Transit Legend", badge: "👑" },
    { miles: 50000, reward: "Epic Commuter", badge: "💎" },
    { miles: 100000, reward: "Free Ticket + Ultimate Commuter", badge: "🎁" },
  ],
};

/**
 * Check if user has reached a mileage milestone
 * @param {number} miles - Current total miles
 * @param {number} previousMiles - Previous miles (before recent addition)
 * @returns {Object|null} Milestone reward if reached, null otherwise
 */
export function checkMilestonReward(miles, previousMiles) {
  for (const milestone of MILEAGE_REWARDS.ACHIEVEMENT_MILESTONES) {
    if (miles >= milestone.miles && previousMiles < milestone.miles) {
      return milestone;
    }
  }
  return null;
}

/**
 * Calculate mileage from distance traveled
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in miles
 */
export function metersToMiles(meters) {
  return meters / 1609.34;
}

/**
 * Generate a random task/quest
 * @param {Array} stations - Available stations
 * @returns {Object} Task object with id, title, description, location, xpReward
 */
export function generateRandomTask(stations) {
  const taskTypes = [
    {
      title: "Station Explorer",
      description: "Visit {station} and check in",
      xp: XP_REWARDS.STATION_VISIT,
    },
    {
      title: "Transfer Master",
      description: "Complete a transfer at {station}",
      xp: XP_REWARDS.SUCCESSFUL_TRANSFER,
    },
    {
      title: "Route Runner",
      description: "Travel the complete route through {station}",
      xp: XP_REWARDS.ROUTE_COMPLETION,
    },
    {
      title: "Community Helper",
      description: "Report transit status near {station}",
      xp: XP_REWARDS.EVENT_REPORT,
    },
  ];
  
  const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  const randomStation = stations[Math.floor(Math.random() * stations.length)];
  
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: randomType.title,
    description: randomType.description.replace('{station}', randomStation.name || 'a station'),
    location: {
      latitude: randomStation.latitude,
      longitude: randomStation.longitude,
    },
    stationId: randomStation.id,
    xpReward: randomType.xp,
    createdAt: Date.now(),
  };
}

/**
 * Event types for social reporting
 */
export const EVENT_TYPES = {
  POLICE: { type: 'Police', icon: '🚔', color: 'red', duration: 300000 }, // 5 min
  DELAY: { type: 'Delay', icon: '⏰', color: 'orange', duration: 600000 }, // 10 min
  CROWDED: { type: 'Crowded', icon: '👥', color: 'yellow', duration: 300000 }, // 5 min
  MAINTENANCE: { type: 'Maintenance', icon: '🔧', color: 'blue', duration: 1800000 }, // 30 min
  INCIDENT: { type: 'Incident', icon: '⚠️', color: 'red', duration: 900000 }, // 15 min
};

/**
 * Create an event report object
 * @param {string} eventType - Type of event (from EVENT_TYPES)
 * @param {Object} location - { latitude, longitude }
 * @param {string} userId - Reporter's user ID
 * @returns {Object} Event report object
 */
export function createEventReport(eventType, location, userId) {
  const eventConfig = EVENT_TYPES[eventType] || EVENT_TYPES.INCIDENT;
  
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: eventConfig.type,
    icon: eventConfig.icon,
    color: eventConfig.color,
    location,
    reporterId: userId,
    timestamp: Date.now(),
    expiresAt: Date.now() + eventConfig.duration,
  };
}

/**
 * Filter expired events
 * @param {Array} events - Array of event objects
 * @returns {Array} Active events only
 */
export function filterActiveEvents(events) {
  const now = Date.now();
  return events.filter(event => event.expiresAt > now);
}

/**
 * Calculate total XP from various activities
 * @param {Object} activities - Object with activity counts
 * @returns {number} Total XP earned
 */
export function calculateXP(activities) {
  let totalXP = 0;
  
  if (activities.tasksCompleted) {
    totalXP += activities.tasksCompleted * XP_REWARDS.TASK_COMPLETE;
  }
  if (activities.milesTraveled) {
    totalXP += Math.floor(activities.milesTraveled * XP_REWARDS.MILE_TRAVELED);
  }
  if (activities.stationsVisited) {
    totalXP += activities.stationsVisited * XP_REWARDS.STATION_VISIT;
  }
  if (activities.successfulTransfers) {
    totalXP += activities.successfulTransfers * XP_REWARDS.SUCCESSFUL_TRANSFER;
  }
  if (activities.routesCompleted) {
    totalXP += activities.routesCompleted * XP_REWARDS.ROUTE_COMPLETION;
  }
  if (activities.dailyLogins) {
    totalXP += activities.dailyLogins * XP_REWARDS.DAILY_LOGIN;
  }
  if (activities.eventsReported) {
    totalXP += activities.eventsReported * XP_REWARDS.EVENT_REPORT;
  }
  
  return totalXP;
}
