// Game Progress Tracker
// Manages player stats, achievements, and daily progress

export class GameProgressTracker {
  constructor() {
    this.loadProgress();
  }

  loadProgress() {
    const saved = localStorage.getItem('gameProgress');
    if (saved) {
      this.progress = JSON.parse(saved);
    } else {
      this.progress = this.getDefaultProgress();
    }
  }

  getDefaultProgress() {
    return {
      // Character
      character: {
        id: 'commuter',
        level: 1,
        xp: 0,
        emoji: '💼'
      },
      
      // Points and Stats
      points: 0,
      totalXP: 0,
      lifetimeMiles: 0,
      currentStreak: 0,
      longestStreak: 0,
      
      // Daily Progress
      daily: {
        ridesCount: 0,
        visitedLines: [],
        visitedStations: [],
        visitedHub: false,
        miles: 0,
        fastTransfer: false,
        socialCount: 0,
        lastReset: new Date().toDateString()
      },
      
      // Achievements
      achievements: [],
      
      // History
      history: {
        totalRides: 0,
        totalTransfers: 0,
        stationsVisited: new Set(),
        linesUsed: new Set(),
        hubsVisited: new Set(),
        peakHourRides: 0,
        weekendRides: 0,
        nightRides: 0
      }
    };
  }

  // Check if daily needs reset
  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.progress.daily.lastReset !== today) {
      // Reset daily stats
      this.progress.daily = {
        ridesCount: 0,
        visitedLines: [],
        visitedStations: [],
        visitedHub: false,
        miles: 0,
        fastTransfer: false,
        socialCount: 0,
        lastReset: today
      };
      this.save();
    }
  }

  // Award points
  awardPoints(amount, reason) {
    this.checkDailyReset();
    this.progress.points += amount;
    this.progress.totalXP += amount;
    
    // Add to character XP
    this.progress.character.xp += amount;
    
    // Check for level up
    const xpForNextLevel = this.progress.character.level * 1000;
    if (this.progress.character.xp >= xpForNextLevel) {
      this.progress.character.level++;
      this.progress.character.xp = this.progress.character.xp % xpForNextLevel;
    }
    
    this.save();
    console.log(`Awarded ${amount} points for: ${reason}`);
    return this.progress.points;
  }

  // Track ride
  trackRide(routeId, fromStation, toStation, distance) {
    this.checkDailyReset();
    
    this.progress.daily.ridesCount++;
    this.progress.history.totalRides++;
    
    // Track line
    if (routeId) {
      const lineName = routeId.replace('Route:', '').split('-')[0];
      if (!this.progress.daily.visitedLines.includes(lineName)) {
        this.progress.daily.visitedLines.push(lineName);
      }
      this.progress.history.linesUsed.add(lineName);
    }
    
    // Track stations
    if (fromStation && !this.progress.daily.visitedStations.includes(fromStation)) {
      this.progress.daily.visitedStations.push(fromStation);
      this.progress.history.stationsVisited.add(fromStation);
    }
    if (toStation && !this.progress.daily.visitedStations.includes(toStation)) {
      this.progress.daily.visitedStations.push(toStation);
      this.progress.history.stationsVisited.add(toStation);
    }
    
    // Track distance
    if (distance) {
      this.progress.daily.miles += distance;
      this.progress.lifetimeMiles += distance;
    }
    
    // Award points
    let points = 50; // Base ride points
    points += Math.floor(distance * 10); // Distance bonus
    
    // Time-based bonuses
    const hour = new Date().getHours();
    if (hour < 7) {
      points += 50; // Early bird
      this.checkAchievement('early_bird');
    } else if (hour >= 22) {
      points += 50; // Night owl
      this.progress.history.nightRides++;
      this.checkAchievement('night_owl');
    } else if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      points += 30; // Rush hour
      this.progress.history.peakHourRides++;
    }
    
    this.awardPoints(points, 'Ride completed');
    this.save();
  }

  // Track transfer
  trackTransfer(duration) {
    this.checkDailyReset();
    this.progress.history.totalTransfers++;
    
    if (duration < 120) { // Under 2 minutes
      this.progress.daily.fastTransfer = true;
      this.awardPoints(100, 'Quick transfer!');
      this.checkAchievement('quick_transfer');
    } else {
      this.awardPoints(20, 'Transfer completed');
    }
    
    this.save();
  }

  // Track hub visit
  trackHubVisit(stationName) {
    this.checkDailyReset();
    const hubs = ['Park Street', 'Downtown Crossing', 'Government Center', 'State', 'Haymarket'];
    
    if (hubs.some(hub => stationName.includes(hub))) {
      this.progress.daily.visitedHub = true;
      this.progress.history.hubsVisited.add(stationName);
      this.awardPoints(150, 'Hub visit!');
      this.checkAchievement('hub_master');
    }
    
    this.save();
  }

  // Track lines achievement
  checkLinesAchievement() {
    this.checkDailyReset();
    const required = ['Red', 'Orange', 'Blue', 'Green'];
    const hasAll = required.every(line => 
      this.progress.daily.visitedLines.some(visited => visited.includes(line))
    );
    
    if (hasAll) {
      this.awardPoints(250, 'All lines visited!');
      this.checkAchievement('lines_visit');
    }
  }

  // Track social interaction
  trackSocialInteraction(nearbyPlayers) {
    this.checkDailyReset();
    if (nearbyPlayers >= 3) {
      this.progress.daily.socialCount = nearbyPlayers;
      this.awardPoints(150, 'Social interaction!');
      this.checkAchievement('social');
    }
  }

  // Check achievements
  checkAchievement(achievementId) {
    if (!this.progress.achievements.includes(achievementId)) {
      this.progress.achievements.push(achievementId);
      this.awardPoints(100, `Achievement unlocked: ${achievementId}`);
    }
  }

  // Upgrade character
  upgradeCharacter(characterId, level, cost) {
    if (this.progress.points >= cost) {
      this.progress.points -= cost;
      this.progress.character.level = level;
      this.save();
      return true;
    }
    return false;
  }

  // Switch character
  switchCharacter(character) {
    this.progress.character = {
      ...character,
      level: 1,
      xp: 0
    };
    this.save();
  }

  // Get progress for daily tasks
  getDailyProgress() {
    this.checkDailyReset();
    return {
      ridesCount: this.progress.daily.ridesCount,
      visitedLines: this.progress.daily.visitedLines,
      visitedHub: this.progress.daily.visitedHub,
      miles: this.progress.daily.miles,
      fastTransfer: this.progress.daily.fastTransfer,
      socialCount: this.progress.daily.socialCount
    };
  }

  // Save to localStorage
  save() {
    // Convert Sets to Arrays for storage
    const toSave = {
      ...this.progress,
      history: {
        ...this.progress.history,
        stationsVisited: Array.from(this.progress.history.stationsVisited),
        linesUsed: Array.from(this.progress.history.linesUsed),
        hubsVisited: Array.from(this.progress.history.hubsVisited)
      }
    };
    
    localStorage.setItem('gameProgress', JSON.stringify(toSave));
  }

  // Get current stats
  getStats() {
    this.checkDailyReset();
    return {
      points: this.progress.points,
      character: this.progress.character,
      totalXP: this.progress.totalXP,
      lifetimeMiles: this.progress.lifetimeMiles,
      daily: this.progress.daily,
      history: {
        ...this.progress.history,
        stationsVisited: this.progress.history.stationsVisited.size || this.progress.history.stationsVisited.length,
        linesUsed: this.progress.history.linesUsed.size || this.progress.history.linesUsed.length,
        hubsVisited: this.progress.history.hubsVisited.size || this.progress.history.hubsVisited.length
      }
    };
  }

  // Reset all progress
  reset() {
    this.progress = this.getDefaultProgress();
    this.save();
  }
}

// Singleton instance
export const gameProgress = new GameProgressTracker();
