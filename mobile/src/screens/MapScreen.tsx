import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocation } from '@hooks/useLocation';
import { useMBTAData } from '@hooks/useMBTAData';
import { decodePolyline } from '@utils/helpers';

export const MapScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const { userLocation, isTracking, error: locationError } = useLocation();
  const { routes, stops, vehicles, loading, error: mbtaError } = useMBTAData();

  // Center map on user location when available
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [userLocation]);

  // Show loading state
  if (loading && routes.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading MBTA data...</Text>
      </View>
    );
  }

  // Show error state
  if ((locationError || mbtaError) && !userLocation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {locationError || mbtaError || 'Unable to load map'}
        </Text>
      </View>
    );
  }

  // Default region (Boston)
  const initialRegion = {
    latitude: userLocation?.latitude || 42.3601,
    longitude: userLocation?.longitude || -71.0589,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Get route color
  const getRouteColor = (route: any): string => {
    const colorMap: { [key: string]: string } = {
      Red: '#DA291C',
      Blue: '#003DA5',
      Orange: '#ED8B00',
      Green: '#00843D',
      'Green-B': '#00843D',
      'Green-C': '#00843D',
      'Green-D': '#00843D',
      'Green-E': '#00843D',
      Mattapan: '#DA291C',
      Silver: '#7C878E',
    };
    return colorMap[route.attributes.long_name] || '#000000';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsTraffic={false}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="You are here"
            description={`Tracking: ${isTracking ? 'Active' : 'Inactive'}`}
            pinColor="blue"
          />
        )}

        {/* MBTA stops */}
        {stops.slice(0, 100).map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{
              latitude: stop.attributes.latitude,
              longitude: stop.attributes.longitude,
            }}
            title={stop.attributes.name}
            description={stop.attributes.description || ''}
            pinColor="orange"
          />
        ))}

        {/* MBTA vehicles */}
        {vehicles.map((vehicle) => {
          if (!vehicle.attributes.latitude || !vehicle.attributes.longitude) return null;
          
          return (
            <Marker
              key={vehicle.id}
              coordinate={{
                latitude: vehicle.attributes.latitude,
                longitude: vehicle.attributes.longitude,
              }}
              title={`Vehicle ${vehicle.id}`}
              description={`Status: ${vehicle.attributes.current_status}`}
              pinColor="green"
            />
          );
        })}

        {/* Route polylines (simplified - first 5 routes) */}
        {routes.slice(0, 5).map((route) => {
          // Note: To draw actual route shapes, we'd need to fetch /shapes endpoint
          // For now, just connecting stops on route
          const routeStops = stops.filter(
            (stop) => stop.relationships?.route?.data?.id === route.id
          );

          if (routeStops.length < 2) return null;

          const coordinates = routeStops.map((stop) => ({
            latitude: stop.attributes.latitude,
            longitude: stop.attributes.longitude,
          }));

          return (
            <Polyline
              key={route.id}
              coordinates={coordinates}
              strokeColor={getRouteColor(route)}
              strokeWidth={3}
            />
          );
        })}
      </MapView>

      {/* Status overlay */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Routes: {routes.length} | Stops: {stops.length} | Vehicles: {vehicles.length}
        </Text>
        {isTracking && (
          <Text style={styles.trackingText}>📍 GPS Tracking Active</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trackingText: {
    fontSize: 12,
    color: '#00843D',
    marginTop: 4,
  },
});
