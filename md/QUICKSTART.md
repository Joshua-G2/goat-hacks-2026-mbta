# 🚇 MBTA RPG Quick Start Guide

## Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MBTA API Key

1. Visit https://api-v3.mbta.com/register
2. Register for a free API key
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Add your API key to `.env`:
   ```
   VITE_MBTA_API_KEY=your_actual_key_here
   ```

### 3. Run the App

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Quick Feature Overview

### Transit Mode (Default)
- **Plan trips** with origin, transfer, and destination selection
- **See real-time predictions** for next trains/buses
- **Check transfer confidence** (Likely/Risky/Unlikely)
- **Adjust walking speed** to customize predictions

### Game Mode (Click "Switch to Game Mode")
- **Earn XP** by completing tasks and traveling
- **Level up** through 12 ranks (Newcomer → MBTA Guardian)
- **Complete tasks** at different stations (+5 XP each)
- **Travel miles** (+1 XP per mile)
- **Report events** like delays or crowding (+2 XP)
- **Generate quests** with AI-powered narratives
- **See other players** on the map (when backend is configured)
- **Unlock achievements** at mileage milestones
- **Earn free ticket** at 100,000 miles

## Demo Mode

The app works **immediately** without any backend setup!

- Mock backend provides demo functionality
- Tasks and events work offline
- Perfect for testing and development

## Adding Real-Time Features (Optional)

For multiplayer and persistent data, add a backend:

### Option A: Firebase (Easiest)

```bash
npm install firebase
```

1. Create project at https://firebase.google.com/
2. Enable Firestore and Authentication
3. Add config to `.env`
4. Uncomment Firebase code in `src/services/backendService.js`

### Option B: Supabase (SQL-based)

```bash
npm install @supabase/supabase-js
```

1. Create project at https://supabase.com/
2. Run SQL schema (see `RPG_FEATURES.md`)
3. Add config to `.env`
4. Uncomment Supabase code in `src/services/backendService.js`

## Key Components

- **TripPlanner** - Smart route planning with predictions
- **GameMap** - RPG mode with tasks and events
- **UserProfile** - XP, levels, and achievements
- **QuestDialog** - AI-generated narrative quests

## Tips for Hackathon

1. **Start Simple**: Use mock backend first, add real backend later
2. **Focus on UX**: The game mechanics work great without multiplayer
3. **Demo the Toggle**: Switch between modes to show versatility
4. **Show Achievements**: Level up and hit milestones for impact
5. **Explain AI Quests**: The integration pattern is impressive even if TTS isn't live

## Next Steps

- Check `RPG_FEATURES.md` for full documentation
- See `API_SETUP.md` for MBTA API details
- Explore components in `src/components/`
- Customize XP rewards in `src/utils/gameHelpers.js`

## Troubleshooting

**No predictions showing?**
→ Make sure MBTA API key is set in `.env`

**Game mode is empty?**
→ Wait a moment for stations to load from MBTA API

**Want to test multiplayer?**
→ Set up Firebase or Supabase backend (10 min setup)

Happy hacking! 🎮🚇
