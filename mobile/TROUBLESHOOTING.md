# MBTA RPG Mobile - Troubleshooting Guide

## ✅ Fixed Issues

1. **TypeScript Version Mismatch** - Downgraded to TypeScript 5.3.3 for Expo compatibility
2. **Type Import Errors** - Fixed all type imports to use `@types` instead of `@types/index`
3. **ENV Import Errors** - Changed to default import: `import ENV from '@utils/config'`
4. **Location Type** - Added missing properties: `heading`, `speed`, `altitude`, `accuracy`, `timestamp`
5. **UserProfile Type** - Added missing properties: `totalTrips`, `achievements`, `badges`, `stats`
6. **GameEvent Type** - Added `level_up` type and made `userId` optional
7. **Alert Import** - Added `import { Alert } from 'react-native'` to contracts.ts
8. **Null Safety** - Added proper null checks throughout the codebase

## 🚀 Running the App on Your Phone

### Method 1: Expo Go (Recommended for Testing)

1. **Install Expo Go on your phone:**
   - iOS: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Make sure your phone and computer are on the same WiFi network**

3. **Scan the QR code:**
   - iOS: Open the Camera app and scan the QR code shown in the terminal
   - Android: Open Expo Go app and tap "Scan QR Code"

4. **Wait for the bundle to load** (first time may take 1-2 minutes)

### Method 2: Development Build (For Full Features)

If Expo Go doesn't work or you need Google Maps:

```bash
# Build for iOS
npx expo run:ios

# Build for Android
npx expo run:android
```

## 🐛 Common Issues & Solutions

### Issue: "Network error" or "Unable to connect"

**Solution:**
1. Ensure phone and computer are on the same WiFi
2. Disable VPN on both devices
3. Check firewall isn't blocking port 8081
4. Try tunnel mode: `npx expo start --tunnel`

### Issue: "Location permission denied"

**Solution:**
1. Go to phone Settings → Privacy → Location Services
2. Find "Expo Go" (or your app name)
3. Enable "While Using the App"

### Issue: "Blank screen" or "App crashes on startup"

**Solution:**
1. Check terminal for error logs
2. Reload the app: shake phone → tap "Reload"
3. Clear cache and restart:
   ```bash
   cd mobile
   npx expo start --clear
   ```

### Issue: "Map doesn't show"

**Solution:**
For development, the map should work with `react-native-maps`. If not:
1. Ensure location permissions are granted
2. Check if GPS is enabled on your phone
3. Try reloading the app

### Issue: "MBTA API not working"

**Solution:**
1. Check if `.env` file exists in `/mobile` folder
2. Verify API key is set: `MBTA_API_KEY=e6d82008f5c44c6c9906ca613361e366`
3. Check internet connection
4. View logs in terminal for API errors

## 🔍 Debug Mode

The app includes a hidden debug drawer:

1. **Open the app**
2. **Tap 5 times in the top-right corner** of the map screen
3. **View system health:**
   - GPS status (active/valid/stale)
   - MBTA polling status
   - Trip plan validity
   - Task synchronization
   - Recent auto-fixes
   - Errors and warnings

## 📱 Testing Checklist

- [ ] App loads without crashing
- [ ] Map displays and is interactive
- [ ] GPS location updates (blue car marker moves)
- [ ] MBTA API fetches routes (check console logs)
- [ ] Search for stops works
- [ ] Debug drawer opens with 5 taps
- [ ] Supervisor health checks run every 3 seconds

## 🆘 Still Having Issues?

1. **Check the terminal output** for detailed error messages
2. **Look at phone logs:**
   - iOS: Xcode → Devices & Simulators → Select device → Console
   - Android: `adb logcat | grep Expo`
3. **Verify contract validation:**
   - App should show contract validation results on startup
   - Check for alerts about missing configurations

## 🔧 Development Commands

```bash
# Start development server
cd mobile && npx expo start

# Clear cache and restart
npx expo start --clear

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Check for TypeScript errors
npx tsc --noEmit

# View all available commands
npx expo start
# Then press ? in the terminal
```

## 📋 Current Status

✅ All TypeScript errors fixed
✅ Expo server running on http://10.218.53.62:8081
✅ Metro bundler ready
✅ QR code available for scanning
✅ Debug drawer integrated
✅ Supervisor loop active
✅ Runtime contracts validated

**Next Step:** Scan the QR code with Expo Go and test the app!
