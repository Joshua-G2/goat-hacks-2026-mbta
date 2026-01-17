# MBTA API Setup Instructions

## API Key Configuration

This project requires an MBTA API key to function. The key has already been obtained with the following details:

- **API Key**: `213b44f07ed24e6bb74f064206968edd`
- **Rate Limit**: 1000 requests per minute
- **API Version**: 2021-01-09
- **Allowed Domains**: * (all domains)

## Setup Steps

1. **Create the .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Add the API key to .env:**
   Open the `.env` file and replace `your_api_key_here` with the actual API key:
   ```
   VITE_MBTA_API_KEY=213b44f07ed24e6bb74f064206968edd
   VITE_MBTA_API_BASE_URL=https://api-v3.mbta.com
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Documentation

- **Full API Docs**: https://api-v3.mbta.com/docs/swagger/index.html
- **Register for API key**: https://api-v3.mbta.com/register

## Usage in Code

The API is configured in `src/config/mbtaApi.js` which provides helper functions:

```javascript
import MBTA_API from '../config/mbtaApi';

// Fetch routes
const routes = await MBTA_API.getRoutes({ type: '0,1' });

// Fetch stops
const stops = await MBTA_API.getStops({ location_type: 1 });

// Fetch real-time predictions
const predictions = await MBTA_API.getPredictions('place-pktrm', { route: 'Red' });

// Fetch alerts
const alerts = await MBTA_API.getAlerts({ route: 'Red' });
```

## Security Note

The .env file is excluded from git (listed in .gitignore). Never commit API keys to version control.

## Rate Limits

With 1000 requests per minute, you can:
- Poll predictions every 30-60 seconds for real-time updates
- Fetch routes/stops data on component mount (cache the results)
- Check alerts periodically (every 2-3 minutes)

## Troubleshooting

If you see "MBTA API key is not configured" in the console:
1. Make sure `.env` file exists in the project root
2. Verify the API key is correctly set in the file
3. Restart the development server (Vite needs restart to pick up .env changes)
