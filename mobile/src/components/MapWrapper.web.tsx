import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web fallback for MapView
export const MapView = ({ children, style, ...props }: any) => {
  return (
    <View style={[styles.mapContainer, style]}>
      <View style={styles.webMapPlaceholder}>
        <Text style={styles.webMapText}>🗺️ MBTA RPG Map</Text>
        <Text style={styles.webMapSubtext}>
          Map view is optimized for mobile devices.
        </Text>
        <Text style={styles.webMapSubtext}>
          Please scan the QR code with Expo Go to experience the full app.
        </Text>
      </View>
      {children}
    </View>
  );
};

export const PROVIDER_GOOGLE = 'google';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 16,
  },
  webMapSubtext: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
  },
});
