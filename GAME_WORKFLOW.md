# 🎮 MBTA Quest - Complete Game Workflow & Design

## 📊 Confidence System Explained

### What is "Likely"?

The **confidence badge** is the core decision-making element that tells players whether their transit journey will succeed. It's calculated in real-time using:

#### Formula:
```
Buffer Time = (Next Train Departure) - (Current Train Arrival) - (Walking Time) - (90s Safety)

IF Buffer ≥ 240s (4+ min)  → 🛡️ LIKELY   (Green, 90%+ success)
IF Buffer 60-239s (1-4 min) → ⚠️ RISKY    (Yellow, 60% success)  
IF Buffer < 60s (<1 min)    → 🚨 UNLIKELY (Red, <25% success)
IF Missing Data             → 🔮 UNKNOWN  (Purple, estimating)
```

#### Confidence Levels:
- **🛡️ Likely** (Green): Comfortable transfer, plenty of time
- **⚠️ Risky** (Yellow): Tight connection, need to move fast
- **🚨 Unlikely** (Red): Probably will miss, suggest alternative
- **🔮 Unknown** (Purple): Missing real-time data, using estimates

---

## 🎯 Complete Game Workflow

### Phase 1: Game Start & Onboarding

```
┌─────────────────────────────────────┐
│  1. Player Opens App (Game Mode)   │
│  - GPS permission requested         │
│  - Location tracking starts         │
│  - MBTA data begins polling (8s)    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  2. Welcome Screen                  │
│  - "Welcome to MBTA Quest"          │
│  - Brief tutorial (optional)        │
│  - Character selection (future)     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  3. Main Game Screen Loads          │
│  - Full-screen map (desaturated)    │
│  - Top HUD: GPS/MBTA/Walk status    │
│  - Bottom Card: collapsed (30% vh)  │
│  - Player avatar appears (blue dot) │
└─────────────────────────────────────┘
```

---

### Phase 2: Destination Selection

```
┌─────────────────────────────────────┐
│  4. Player Taps Bottom Card         │
│  - Card expands to 65% viewport     │
│  - Shows "Select Destination"       │
│  - Confidence badge: 🔮 Unknown     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  5. Destination Picker Opens        │
│  - List of nearby stations          │
│  - Search by station name           │
│  - Distance shown for each          │
│  - Popular destinations highlighted │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  6. Player Selects Destination      │
│  Example: "Park Street Station"     │
│  - Quest generation starts          │
│  - Route calculation begins         │
└─────────────────────────────────────┘
```

---

### Phase 3: Quest Generation & Route Planning

```
┌─────────────────────────────────────┐
│  7. Real-Time Route Analysis        │
│  Data Sources:                      │
│  ✓ Player GPS position              │
│  ✓ MBTA vehicle locations           │
│  ✓ Live predictions (/predictions)  │
│  ✓ Walking directions (SerpAPI)     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  8. Quest Timeline Generated        │
│  Example Quest Steps:               │
│  👣 Walk to Park St (0.3 mi, 6 min) │
│  🚆 Board Red Line (Alewife dir)    │
│  🚇 Ride 3 stops (8 min)            │
│  🔄 Transfer to Orange Line         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  9. Confidence Calculated           │
│  Algorithm:                         │
│  - Check next train arrival time    │
│  - Calculate walk to platform       │
│  - Compute buffer time              │
│  - Assign badge: Likely/Risky/etc   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  10. Bottom Card Updates            │
│  Shows:                             │
│  - Destination: "Park Street"       │
│  - Confidence: 🛡️ LIKELY            │
│  - Quest timeline (4 steps)         │
│  - "START JOURNEY" button           │
└─────────────────────────────────────┘
```

---

### Phase 4: Active Journey (Core Gameplay Loop)

```
┌─────────────────────────────────────┐
│  11. Player Starts Journey          │
│  - First quest activates            │
│  - Step 1: "Walk to Park St" ACTIVE │
│  - Map shows walking route          │
│  - Progress tracked via GPS         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  12. Real-Time Updates (Every 8s)   │
│  Continuous monitoring:             │
│  - Player distance to waypoint      │
│  - Train positions updated          │
│  - Confidence recalculated          │
│  - Quest timeline refreshed         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  13. Step Completion Detection      │
│  Walk Step Complete When:           │
│  - Player within 100m of station    │
│  - GPS confirms location            │
│  ✓ Step marked COMPLETED            │
│  → Next step becomes ACTIVE         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  14. Dynamic Confidence Updates     │
│  As player progresses:              │
│  - Train arrives → buffer shrinks   │
│  - Player walks faster → improves   │
│  - Delays detected → downgrades     │
│  LIKELY → RISKY → UNLIKELY          │
└─────────────────────────────────────┘
```

---

### Phase 5: Critical Decision Points

```
┌─────────────────────────────────────┐
│  15. Scenario: Confidence Changes  │
│                                     │
│  A) LIKELY → RISKY                  │
│     - Alert: "⚠️ Train delayed!"    │
│     - Suggest: "Move faster"        │
│     - Update: Quest timeline        │
│                                     │
│  B) RISKY → UNLIKELY                │
│     - Alert: "🚨 May miss transfer!"│
│     - Suggest: "Wait for next train"│
│     - Button: "REPLAN ROUTE"        │
│                                     │
│  C) LIKELY stays LIKELY             │
│     - Encouragement: "On track! ✓"  │
│     - No action needed              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  16. Player Decision                │
│  Options presented:                 │
│  1. Continue with risky plan        │
│  2. Wait for safer connection       │
│  3. Find alternative route          │
│  4. Cancel and restart              │
└─────────────────────────────────────┘
```

---

### Phase 6: Boarding & Riding

```
┌─────────────────────────────────────┐
│  17. Board Train Detection          │
│  Triggers when:                     │
│  - Player within 150m of vehicle    │
│  - Vehicle departing within 2 min   │
│  - GPS speed increases (moving)     │
│  ✓ "Board Red Line" → COMPLETED     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  18. Ride Tracking                  │
│  Active display shows:              │
│  - Current line (Red Line)          │
│  - Direction (Alewife)              │
│  - Stops remaining: 3 → 2 → 1       │
│  - Estimated time: 8 min → 5 min    │
│  - Next stop countdown              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  19. Transfer Alert (If Applicable) │
│  Before transfer station:           │
│  - "🔔 Next Stop: Transfer Point"   │
│  - "Walk time: 2 minutes"           │
│  - "Connection in: 4 minutes"       │
│  - Confidence: Still LIKELY         │
└─────────────────────────────────────┘
```

---

### Phase 7: Transfer Execution

```
┌─────────────────────────────────────┐
│  20. Exit Train                     │
│  - GPS detects station arrival      │
│  - "Ride 3 stops" → COMPLETED ✓     │
│  - "Transfer to Orange" → ACTIVE    │
│  - Walking route appears on map     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  21. Transfer Navigation            │
│  Real-time guidance:                │
│  - Arrow pointing to platform       │
│  - Distance: 150m → 100m → 50m      │
│  - Time remaining to departure      │
│  - Countdown: 3:45 → 3:30 → 3:15    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  22. Make or Miss Transfer          │
│                                     │
│  SUCCESS (Made it):                 │
│  - Player boards before departure   │
│  - XP awarded: +150 points          │
│  - Badge: "⚡ Speed Demon"          │
│  - Quest continues                  │
│                                     │
│  FAILURE (Missed it):               │
│  - Train departed without player    │
│  - "😞 Missed connection"           │
│  - Options: Wait for next train     │
│  - Confidence downgraded            │
└─────────────────────────────────────┘
```

---

### Phase 8: Arrival & Completion

```
┌─────────────────────────────────────┐
│  23. Final Destination Approach     │
│  - Last train ride in progress      │
│  - "Arriving at Park Street"        │
│  - Quest completion countdown       │
│  - Final stop highlighted on map    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  24. Quest Complete!                │
│  Success Screen Shows:              │
│  ✓ Total time: 22 minutes           │
│  ✓ Distance traveled: 4.2 miles     │
│  ✓ Transfers made: 1/1              │
│  ✓ Confidence accuracy: LIKELY ✓    │
│                                     │
│  Rewards:                           │
│  🏆 +300 XP                         │
│  🎖️ Badge: "Navigator"              │
│  📊 Stats updated                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  25. Post-Quest Options             │
│  Player can:                        │
│  1. Start new quest                 │
│  2. View stats/achievements         │
│  3. Share completion                │
│  4. Switch to transit mode          │
└─────────────────────────────────────┘
```

---

## 🎲 Gamification Elements

### XP & Leveling System

```javascript
XP Awards:
- Complete walking step:     +50 XP
- Board correct train:        +100 XP
- Successful transfer:        +150 XP
- Quest complete (easy):      +300 XP
- Quest complete (risky):     +500 XP
- Perfect timing (0-30s):     +200 XP bonus
- Chain quests (3 in row):    +1000 XP
```

### Achievement Badges

```
🚀 Speed Badges:
   - "Flash" - Complete quest 20% faster than predicted
   - "Speedster" - Make transfer with <1 min to spare
   - "Bullet Train" - 10 quests in one day

🎯 Accuracy Badges:
   - "Navigator" - Complete 10 quests with LIKELY confidence
   - "Risk Taker" - Complete 5 RISKY quests successfully
   - "Daredevil" - Complete 1 UNLIKELY quest

📍 Exploration Badges:
   - "Station Master" - Visit all Red Line stations
   - "Line Hopper" - Use all 4 subway lines in one day
   - "Hub Hero" - Complete 50 transfers at Park St
```

### Leaderboards

```
Weekly Rankings:
1. Most XP earned
2. Most quests completed
3. Fastest average time
4. Most stations visited
5. Transfer success rate
```

---

## 🔮 Future Enhancements

### Quest Types

1. **Daily Challenges**
   - "Visit 3 Green Line stations today"
   - "Make a transfer in under 90 seconds"
   - "Travel during peak hours without delays"

2. **Timed Missions**
   - "Reach destination in 15 minutes"
   - "Beat the clock: Park St → Alewife"

3. **Exploration Quests**
   - "Discover a new station"
   - "Take a route you've never used"

4. **Social Quests**
   - "Meet another player at transfer point"
   - "Complete parallel quests with friend"

### Dynamic Events

```javascript
Random Events (10% chance per quest):
- "🎉 Happy Hour" - Double XP for next hour
- "🚧 Construction Delay" - Alternative routes shown
- "🌟 Mystery Station" - Hidden bonus checkpoint
- "⚡ Express Mode" - Skip-stop service detected
```

---

## 📱 UI/UX Flow Refinements

### Bottom Card States

```css
COLLAPSED (30% height):
- Objective title
- Destination name
- Confidence badge only
- Chevron up arrow

EXPANDED (65% height):
- Full objective details
- Large confidence badge (pulsing)
- Complete quest timeline (4-6 steps)
- Progress indicators per step
- Primary action button
- Secondary options menu
- Chevron down arrow
```

### Status Chip Meanings

```
GPS Chip:
  🟢 Green = Live, accurate (<30s old)
  🟡 Yellow = Stale (30-60s old)
  🔴 Red = Lost signal (>60s)
  
MBTA Chip:
  🟢 Green = Live data from API
  🟡 Yellow = Using schedules (fallback)
  🔴 Red = No data available
  
WALK Chip:
  🟢 Green = SerpAPI directions
  🟡 Yellow = Heuristic estimate
  🔴 Red = No walking data
```

---

## 🧭 Navigation & Wayfinding

### Map Features

```javascript
Active Elements:
- Player Avatar: Blue pulsing circle (50m radius)
- Destination: Green star marker with label
- Active Waypoint: Yellow pin with distance
- Train Vehicles: Color-coded dots per route
  * Red Line: #DA291C
  * Orange: #ED8B00
  * Blue: #003DA5
  * Green: #00843D
- Walking Route: Dashed blue line
- Train Route: Solid colored line
```

### Turn-by-Turn Guidance

```
Text Prompts:
"In 150m, turn right to Red Line platform"
"Ahead: Stairs to Orange Line"
"Platform 2 - Alewife trains"

Visual Cues:
→ Arrows on map
📍 Distance countdown
🎯 Highlight target area
```

---

## 📊 Analytics & Feedback Loop

### Data Collected (Anonymous)

```javascript
Per Quest:
- Route chosen
- Confidence at start/end
- Actual vs predicted time
- Transfer success/failure
- GPS accuracy during journey
- MBTA data availability
- Player deviations from route

Aggregated:
- Most successful routes
- Common failure points
- Peak usage times
- Average confidence accuracy
- Popular destinations
```

### Player Feedback

```
After Each Quest:
"How was your journey?"
- 😊 Great! (as expected)
- 😐 Okay (minor issues)
- 😞 Difficult (missed transfer)

"Was the confidence accurate?"
- ✅ Yes, helped me plan
- ⚠️ Close, but not perfect
- ❌ No, very off
```

---

## 🎯 Success Metrics

### Player Engagement

```
Daily Active Users (DAU):
- Track unique daily players
- Quest completion rate
- Average quests per session
- Session duration

Retention:
- Day 1 retention: 70%+ goal
- Day 7 retention: 40%+ goal  
- Day 30 retention: 20%+ goal
```

### System Performance

```
Technical KPIs:
- GPS accuracy: <30m error
- MBTA data freshness: <10s lag
- Confidence accuracy: 85%+ correct
- App responsiveness: <100ms UI updates
- Battery usage: <5% per hour
```

---

## 🚀 Launch Checklist

### Phase 1: Core Features (MVP)
- [x] GPS tracking with auto-recovery
- [x] MBTA real-time vehicle polling
- [x] Walking route estimation
- [x] Confidence calculation algorithm
- [x] GameScreen UI with Figma design
- [x] Quest timeline generation
- [ ] Destination selection overlay
- [ ] Step completion detection
- [ ] XP/rewards system
- [ ] Basic achievements

### Phase 2: Enhanced Gameplay
- [ ] Daily challenges
- [ ] Leaderboards
- [ ] Social features (see other players)
- [ ] Event reporting
- [ ] Push notifications
- [ ] Offline mode support

### Phase 3: Polish & Scale
- [ ] Onboarding tutorial
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Analytics dashboard
- [ ] User feedback integration
- [ ] Multi-language support

---

## 💡 Key Design Principles

1. **Confidence First**: The confidence badge is the hero element - always visible, always accurate
2. **Minimal Friction**: 3 taps max from open to journey start
3. **Real-Time Truth**: Show live data, never lie about timing
4. **Fail Gracefully**: Missed transfer? Offer next steps immediately
5. **Celebrate Success**: Reward completion with satisfying feedback
6. **Learn & Adapt**: Use data to improve route suggestions

---

This workflow transforms MBTA Quest from a transit helper into an engaging game where every journey is a quest, every transfer is a challenge, and every arrival is a victory! 🎮🚇🏆
