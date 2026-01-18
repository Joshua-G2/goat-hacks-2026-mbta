/**
 * Quest Service
 * 
 * Handles quest generation and AI integration
 */

/**
 * Generate a quest using RAG (Retrieval-Augmented Generation)
 * 
 * @param {string} stationId - MBTA station ID
 * @param {string} userId - User ID
 * @param {object} context - Rich context for quest generation
 * @returns {Promise<object>} Generated quest with dynamic lore
 */
export async function generateQuest(stationId, userId, context = {}) {
  // Simulate API delay for RAG processing
  await new Promise(resolve => setTimeout(resolve, 800));

  // RAG-style: Use context to generate dynamic quests
  const {
    stationName = 'the station',
    userLevel = 1,
    userXp = 0,
    timeOfDay = new Date().getHours(),
    dayOfWeek = new Date().getDay(),
    nearbyStations = [],
    alerts = [],
    recentEvents = [],
    tasksCompleted = 0,
    weather = 'clear'
  } = context;

  // Dynamic quest templates based on context
  const questTemplates = [];

  // Time-based quests
  if (timeOfDay >= 7 && timeOfDay <= 9) {
    questTemplates.push({
      title: "Rush Hour Survivor",
      description: `The morning rush at ${stationName} is legendary. Navigate through the crowds and help 3 confused commuters find their platforms. The station's energy is palpable - use it wisely!`,
      reward: 30,
      type: 'timed-challenge',
    });
  } else if (timeOfDay >= 22 || timeOfDay <= 5) {
    questTemplates.push({
      title: "Night Owl's Mystery",
      description: `Strange echoes fill ${stationName} after midnight. Local legends speak of a ghostly conductor who appears to those brave enough to explore. Investigate the unusual sounds on Platform 2.`,
      reward: 35,
      type: 'exploration',
    });
  }

  // Alert-based dynamic quests
  if (alerts && alerts.length > 0) {
    questTemplates.push({
      title: "Service Disruption Hero",
      description: `Alert: ${alerts[0]}. Stranded passengers at ${stationName} need help finding alternative routes. Your knowledge of the MBTA network is their salvation!`,
      reward: 40,
      type: 'urgent',
    });
  }

  // Level-appropriate quests
  if (userLevel >= 5) {
    questTemplates.push({
      title: "Master Navigator Challenge",
      description: `As a veteran transit warrior (Level ${userLevel}), you've been chosen to guide a tour group through ${nearbyStations.join(', ')}. Show them the hidden gems only locals know!`,
      reward: 50,
      type: 'expert',
    });
  }

  // Weather-based quests
  if (weather === 'rainy' || weather === 'snowy') {
    questTemplates.push({
      title: "Stormy Day Samaritan",
      description: `The weather has driven everyone indoors. ${stationName} is packed! Help maintain order by directing people to less crowded platforms and earn the gratitude of your fellow commuters.`,
      reward: 25,
      type: 'social',
    });
  }

  // Weekend special quests
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    questTemplates.push({
      title: "Weekend Explorer",
      description: `${stationName} transforms on weekends! Discover the local café that only opens Saturday mornings, or find the hidden art installation that appeared overnight. Adventure awaits!`,
      reward: 30,
      type: 'exploration',
    });
  }

  // Default/fallback quests with station lore
  questTemplates.push(
    {
      title: "The Lost Commuter",
      description: `A frazzled tourist at ${stationName} desperately needs directions to Fenway Park. They've been wandering for 20 minutes. Your local expertise could save their day - and maybe score you a hot dog!`,
      reward: 20,
      type: 'social',
    },
    {
      title: "Station Historian",
      description: `${stationName} has been serving Boston since the early 1900s. An elderly passenger wants to share stories of how the station looked decades ago. Listen and learn the hidden history.`,
      reward: 25,
      type: 'lore',
    },
    {
      title: "Platform Detective",
      description: `Someone left a mysterious package on Platform 3 at ${stationName}. Transit police need your help identifying if it's just lost luggage or something more concerning. Your vigilance matters!`,
      reward: 35,
      type: 'investigation',
    }
  );

  // Select quest based on context
  const selectedQuest = questTemplates[Math.floor(Math.random() * questTemplates.length)];
  
  return {
    ...selectedQuest,
    id: `quest-${Date.now()}`,
    timestamp: Date.now(),
    userId,
    stationId,
    stationName,
    context: {
      timeOfDay,
      weather,
      userLevel,
      nearbyStations
    }
  };
}

export default {
  generateQuest,
};
