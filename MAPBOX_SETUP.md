# 3D POV Map Setup Guide

## Overview

The game mode now features a **Pokemon GO-style 3D POV map** using Mapbox GL JS! This provides:

- **3D Buildings** and terrain visualization
- **First-person POV** perspective (tilted view)
- **Device orientation** support (compass/gyroscope)
- **Real-time GPS** tracking
- **Smooth camera** animations

## Quick Start

### 1. Get a Free Mapbox Token

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account (no credit card required)
3. Navigate to **Access Tokens** in your dashboard
4. Copy your **Default Public Token** or create a new one
5. Free tier includes:
   - 50,000 map loads per month
   - Unlimited API requests
   - Perfect for development and small apps

### 2. Configure Your Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Mapbox token to `.env`:
   ```env
   VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0.example
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Features

### Map Modes

Switch between two map modes using the toggle buttons:

- **🏙️ 3D POV** - Pokemon GO style first-person view with 3D buildings
- **🗺️ 2D Map** - Classic top-down view using Leaflet

### Controls (3D Mode)

- **📍 Recenter** - Snap camera back to your position
- **🧭 Compass** - Enable device orientation (gyroscope)
- **🗺️/🏙️ Toggle** - Switch between 2D and 3D views

### Device Orientation (Mobile)

On mobile devices, tap the **🧭 Compass** button to enable:
- Real-time compass direction
- Gyroscope-based camera rotation
- Tilt your phone to look around

*Note: iOS requires explicit permission for device orientation*

### HUD (Heads-Up Display)

The 3D map includes a game HUD showing:
- **Nearby Quests** - Number of active tasks
- **Events** - Current event count
- **Compass Rose** - Direction and heading

## Customization

### Map Styles

You can change the Mapbox style in `src/components/POVMap.jsx`:

```jsx
mapStyle="mapbox://styles/mapbox/streets-v12"
```

Available styles:
- `streets-v12` - Default streets
- `outdoors-v12` - Hiking/outdoor
- `light-v11` - Light theme
- `dark-v11` - Dark theme
- `satellite-v9` - Satellite imagery
- `satellite-streets-v12` - Satellite with labels

### Camera Settings

Adjust the POV view in `POVMap.jsx`:

```jsx
const [viewState, setViewState] = useState({
  zoom: 17,        // How close (15-20 for street level)
  pitch: 70,       // Tilt angle (0-85, higher = more tilted)
  bearing: 0       // Compass direction (0-360)
});
```

### 3D Buildings

Modify building appearance in the `addLayer` configuration:

```jsx
'fill-extrusion-color': '#aaa',  // Building color
'fill-extrusion-opacity': 0.6    // Transparency (0-1)
```

### Terrain Exaggeration

Change terrain height in `setTerrain`:

```jsx
map.setTerrain({ 
  source: 'mapbox-dem', 
  exaggeration: 1.5  // Higher = more dramatic hills
});
```

## Task Markers

Quest markers are custom HTML elements with:
- **Pulsing animation** to draw attention
- **Custom icons** (🎯 by default)
- **Hover labels** showing quest names
- **Click handlers** to complete tasks

Customize in `POVMap.jsx`:

```jsx
el.innerHTML = `
  <div class="task-pulse"></div>
  <div class="task-icon">🎯</div>
  <div class="task-label">${task.title}</div>
`;
```

## Troubleshooting

### Map Not Loading

1. **Check your token**: Verify `VITE_MAPBOX_TOKEN` in `.env`
2. **Restart server**: Changes to `.env` require restart
3. **Check browser console**: Look for Mapbox errors
4. **Token permissions**: Ensure token has "Public" scope

### GPS Not Working

1. **Enable location**: Allow browser location access
2. **HTTPS required**: Geolocation needs secure context
3. **Check permissions**: Browser settings → Site permissions

### Compass Not Working

1. **iOS**: Tap 🧭 button to request permission
2. **HTTPS required**: Device orientation needs secure connection
3. **Mobile only**: Gyroscope not available on desktop

### Performance Issues

1. **Reduce terrain exaggeration**: Lower from 1.5 to 1.0
2. **Disable 3D buildings**: Comment out `addLayer` for buildings
3. **Lower zoom**: Reduce default zoom from 17 to 15
4. **Use lighter style**: Switch to `light-v11` map style

## API Limits

Mapbox free tier provides:
- **50,000 map loads/month**
- **Unlimited requests** for tiles, geocoding, etc.
- **No time limit** on free tier

A "map load" counts when:
- User opens the app
- Page refreshes
- Map style changes

Tips to reduce loads:
- Cache map tiles (automatic)
- Don't refresh page unnecessarily
- Use same style throughout app

## Advanced Features

### Custom Map Styles

Create custom styles at [Mapbox Studio](https://studio.mapbox.com/):
1. Sign in to Mapbox
2. Go to Studio
3. Create new style
4. Use the style URL in your app

### Add Vector Data

Display custom GeoJSON layers:

```jsx
map.addSource('my-data', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [/* your features */]
  }
});

map.addLayer({
  id: 'my-layer',
  type: 'circle',
  source: 'my-data',
  paint: {
    'circle-radius': 8,
    'circle-color': '#FF0000'
  }
});
```

### Heatmaps

Show player density:

```jsx
map.addLayer({
  id: 'players-heat',
  type: 'heatmap',
  source: 'players',
  paint: {
    'heatmap-intensity': 1,
    'heatmap-radius': 50
  }
});
```

## Resources

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [React Map GL](https://visgl.github.io/react-map-gl/)
- [Mapbox Studio](https://studio.mapbox.com/)
- [API Examples](https://docs.mapbox.com/mapbox-gl-js/example/)

## Support

Having issues? Check:
1. Browser console for errors
2. Network tab for API calls
3. `.env` file configuration
4. Mapbox account dashboard for usage

Enjoy your 3D POV map! 🎮🗺️
