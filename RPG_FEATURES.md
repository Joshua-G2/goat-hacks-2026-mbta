# MBTA RPG Mode - Implementation Guide

## Overview

This implementation adds a comprehensive RPG (Role-Playing Game) mode to the MBTA transit app, transforming it into a Pokémon Go-style adventure across Boston's public transit system.

## Features Implemented

### 1. **Interactive MBTA Transit Features** ✅

Located in: `src/components/TripPlanner.jsx`

- **Route & Stop Selection**: Dynamic dropdowns for origin, transfer, and destination
- **Real-time Predictions**: Live departure/arrival times from MBTA API
- **Walking Time Estimation**: Calculates walk time between transfer points
- **Transfer Confidence**: Labels connections as "Likely", "Risky", or "Unlikely"
- **Adjustable Walk Speed**: User-configurable walking speed (3-6 km/h)

**Key Functions** (in `src/utils/transitHelpers.js`):
- `computeWalkMinutes()` - Calculate walking time
- `calculateDistance()` - Haversine formula for coordinates
- `getTransferConfidence()` - Determine connection feasibility

### 2. **Game Mode Toggle** ✅

Located in: `src/App.jsx`

- **Mode Switch Button**: Seamlessly toggle between Transit and Game modes
- **Persistent State**: XP, miles, and tasks persist across mode switches
- **Dual UI**: Complete separate interfaces for each mode

### 3. **User Levels and Titles** ✅

Located in: `src/components/UserProfile.jsx` + `src/utils/gameHelpers.js`

**Level System** (12 levels):
- Level 1: Newcomer (0 XP)
- Level 2: Rookie Rider (100 XP)
- Level 3: Transit Explorer (300 XP)
- Level 5: Conductor (1000 XP)
- Level 9: Transit Master (5000 XP)
- Level 11: Legendary Commuter (10,000 XP)
- Level 12: MBTA Guardian (15,000 XP)

**Features**:
- XP progress bar with percentage
- Visual level badge
- Achievement tracking
- Stats dashboard (tasks, miles, XP, achievements)

### 4. **XP & Points System** ✅

Located in: `src/utils/gameHelpers.js`

**XP Rewards**:
- Task completion: +5 XP
- Mile traveled: +1 XP
- Station visit: +2 XP
- Successful transfer: +3 XP
- Route completion: +10 XP
- Daily login: +5 XP
- Event report: +2 XP

**Mileage Rewards**:
- Achievements at: 100, 500, 1K, 5K, 10K, 50K, 100K miles
- Free ticket at 100,000 miles
- Progress bar showing ticket progress

### 5. **RPG Map with Tasks** ✅

Located in: `src/components/GameMap.jsx`

**Features**:
- Interactive map display (placeholder for Leaflet/Mapbox)
- Task markers with quest objectives
- User position tracking
- HUD overlay (XP, miles display)
- Task completion system
- Event reporting menu

**Task System**:
- Auto-generated tasks at random stations
- 4 task types: Station Explorer, Transfer Master, Route Runner, Community Helper
- Visual task list with XP rewards
- One-click task completion

### 6. **Social Features** ✅

Located in: `src/services/backendService.js` + `GameMap.jsx`

**Real-time Multiplayer**:
- Live user location sharing
- Other players visible on map
- Player count in footer

**Event Reporting**:
- 5 event types: Police, Delay, Crowded, Maintenance, Incident
- Custom icons and colors per event type
- Auto-expiring events (5-30 min based on type)
- Community event feed

**Backend Support**:
- Mock backend (for demo/development)
- Firebase integration hooks (commented)
- Supabase integration hooks (commented)

### 7. **Dynamic Quest System** ✅

Located in: `src/components/QuestDialog.jsx`

**Quest Features**:
- Beautiful dialog UI with NPC avatars
- Quest narrative text
- Audio playback support (for TTS)
- Accept/Decline actions
- XP rewards display

**AI Integration Ready**:
- `generateQuest()` function for backend calls
- RAG (Retrieval-Augmented Generation) workflow documented
- LlamaIndex integration pattern
- OpenRouter/OpenAI LLM support pattern
- ElevenLabs TTS integration pattern

**Backend Quest Flow** (pseudo-code provided):
1. Gather station context (MBTA data, alerts, lore)
2. RAG query via LlamaIndex
3. LLM prompt generation (OpenRouter)
4. Text-to-Speech (ElevenLabs)
5. Return quest + audio URL

## File Structure

```
src/
├── components/
│   ├── TripPlanner.jsx          # Enhanced trip planning
│   ├── TripPlanner.css
│   ├── GameMap.jsx               # RPG map view
│   ├── GameMap.css
│   ├── UserProfile.jsx           # Levels, XP, achievements
│   ├── UserProfile.css
│   ├── QuestDialog.jsx           # AI-generated quests
│   └── QuestDialog.css
├── utils/
│   ├── transitHelpers.js         # Transit calculations
│   └── gameHelpers.js            # Game mechanics (XP, levels, tasks)
├── services/
│   └── backendService.js         # Backend integration layer
├── config/
│   └── mbtaApi.js               # MBTA API wrapper (existing)
└── App.jsx                       # Main app with mode toggle
```

## Usage Guide

### Running the App

```bash
# Install dependencies
npm install

# Set up environment variables (create .env file)
VITE_MBTA_API_KEY=your_api_key_here
VITE_BACKEND_TYPE=none  # or 'firebase' or 'supabase'

# Run development server
npm run dev
```

### Game Mode Controls

1. **Toggle Mode**: Click "Switch to Game Mode" button in header
2. **Complete Tasks**: Click ✓ button on task items
3. **Report Events**: Click "Report Event" button → Select event type
4. **Generate Quest**: Click "Generate New Quest" button in sidebar
5. **View Profile**: See XP, level, and achievements in left sidebar

### Transit Mode Controls

1. **Plan Trip**: Select origin/destination routes and stops
2. **Set Transfer**: Choose optional transfer station
3. **Adjust Speed**: Slide walking speed control
4. **View Predictions**: Real-time arrivals/departures update every 30s
5. **Check Confidence**: See transfer feasibility (Likely/Risky/Unlikely)

## Backend Integration

### Option 1: Firebase

```bash
npm install firebase
```

Uncomment Firebase code in `src/services/backendService.js` and configure:

```env
VITE_BACKEND_TYPE=firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

**Firestore Collections**:
- `users`: { uid, name, xp, miles, title }
- `locations`: { userId, latitude, longitude, timestamp }
- `events`: { type, location, reporterId, timestamp, expiresAt }

### Option 2: Supabase

```bash
npm install @supabase/supabase-js
```

Uncomment Supabase code in `src/services/backendService.js` and configure:

```env
VITE_BACKEND_TYPE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**PostgreSQL Tables**:
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  xp INTEGER DEFAULT 0,
  miles REAL DEFAULT 0,
  title TEXT DEFAULT 'Newcomer'
);

-- Locations table
CREATE TABLE locations (
  user_id TEXT PRIMARY KEY,
  latitude REAL,
  longitude REAL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  latitude REAL,
  longitude REAL,
  reporter_id TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### Option 3: Mock Backend (Default)

No setup required! The app works out-of-the-box with a mock backend for development and testing.

## AI Quest Generation Setup

### Backend API Endpoint

Create a backend endpoint (Node.js/Python) for quest generation:

```javascript
// POST /generateQuest
{
  "station": "place-pktrm",
  "user": "user_123",
  "context": { "stationName": "Park Street" }
}
```

### Integration Stack

1. **LlamaIndex** - RAG for knowledge retrieval
   ```bash
   pip install llama-index
   ```

2. **OpenRouter** - LLM API (GPT-4, Claude, etc.)
   ```bash
   # API: https://openrouter.ai/
   ```

3. **ElevenLabs** - Text-to-Speech
   ```bash
   # API: https://elevenlabs.io/
   ```

### Example Backend Flow

```python
from llama_index import VectorStoreIndex, SimpleDirectoryReader
import openai
import requests

# 1. Load and index MBTA knowledge base
documents = SimpleDirectoryReader('mbta_data').load_data()
index = VectorStoreIndex.from_documents(documents)

# 2. Query relevant context
query_engine = index.as_query_engine()
context = query_engine.query(f"Information about {station_name}")

# 3. Generate quest with LLM
prompt = f"""You are a transit NPC. Create an engaging quest.
Station: {station_name}
Context: {context}
Quest narrative:"""

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": prompt}]
)
quest_text = response.choices[0].message.content

# 4. Generate voice with ElevenLabs
audio_response = requests.post(
    "https://api.elevenlabs.io/v1/text-to-speech/voice_id",
    json={"text": quest_text}
)
audio_url = upload_audio(audio_response.content)

# 5. Return to client
return {
    "questText": quest_text,
    "audioUrl": audio_url,
    "xpReward": 10
}
```

## Map Integration

For production, integrate a real map library:

### Leaflet (Recommended for hackathon)

```bash
npm install leaflet react-leaflet
```

```jsx
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';

<MapContainer center={[42.3601, -71.0589]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {/* Add markers, routes, etc. */}
</MapContainer>
```

### Mapbox GL JS (Advanced)

```bash
npm install mapbox-gl react-map-gl
```

Requires Mapbox API key and more setup.

## Performance Tips

1. **Cache MBTA Data**: Routes and stops don't change often
2. **Debounce API Calls**: Limit prediction updates to 30-60s intervals
3. **Lazy Load**: Load map libraries only in Game Mode
4. **Local Storage**: Persist XP/miles for offline capability
5. **Throttle Location Updates**: Update every 30s, not continuously

## Testing Checklist

- [ ] Mode toggle works smoothly
- [ ] XP increments on task completion
- [ ] Level up triggers at correct thresholds
- [ ] Tasks generate at random stations
- [ ] Events expire after timeout
- [ ] Transfer confidence calculates correctly
- [ ] Real-time predictions update
- [ ] Quest dialog displays properly
- [ ] Achievements unlock at milestones
- [ ] Free ticket reward at 100K miles

## Future Enhancements

1. **Leaderboards**: Global XP rankings
2. **Teams/Guilds**: Collaborative transit challenges
3. **Special Events**: Time-limited quests with bonus XP
4. **Customization**: Avatar skins, themes unlocked by level
5. **AR Mode**: Augmented reality station check-ins
6. **Trading System**: Exchange collectibles with other players
7. **Battle System**: Friendly transit trivia competitions
8. **Seasonal Quests**: Holiday-themed challenges

## Troubleshooting

**MBTA API not working?**
- Check `.env` has `VITE_MBTA_API_KEY`
- Verify API key at https://api-v3.mbta.com/

**No predictions showing?**
- Ensure route and stop IDs are valid
- Check browser console for API errors
- Try different stops/routes

**Game mode empty?**
- Wait for stations to load (check console)
- Refresh page if stations list is empty
- Check MBTA API quota limits

**Quest generation fails?**
- Backend endpoint must be configured
- For demo, mock quest generator works offline

## Credits

- MBTA V3 API: https://www.mbta.com/developers/v3-api
- Built for Goat Hacks 2026
- Inspired by Pokémon Go and Ingress gameplay

## License

MIT License - Free to use and modify
