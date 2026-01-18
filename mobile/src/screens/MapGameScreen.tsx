import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { MapView, PROVIDER_GOOGLE } from '@components/MapWrapper';
import type { Region } from '@components/MapWrapper';
import { PlayerCarMarker } from '@components/PlayerCarMarker';
import { DebugDrawer } from '@components/DebugDrawer';
import { useLocationStore } from '@store/locationStore';
import { useLiveLocation } from '@hooks/useLiveLocation';
import { searchStopsByName, getStopsByRoute } from '@api/mbtaClient';
import type { StopData } from '@api/mbtaClient';

interface TripState {
  startLocation: 'current' | StopData | null;
  selectedDestination: StopData | null;
}

export const MapGameScreen: React.FC = () => {
  const mapRef = useRef<any>(null);
  const { userLocation } = useLocationStore();
  const { status } = useLiveLocation();

  // Trip state
  const [trip, setTrip] = useState<TripState>({
    startLocation: 'current',
    selectedDestination: null,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StopData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Game mode
  const [gameMode, setGameMode] = useState(true);

  // Initial map region (Boston)
  const [region, setRegion] = useState<Region>({
    latitude: 42.3601,
    longitude: -71.0589,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Center map on user location when available
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [userLocation]);

  // Search for stops
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a stop name');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchStopsByName(searchQuery);

      if (!result.ok) {
        setSearchError(result.error || 'Search failed');
        setSearchResults([]);
        return;
      }

      if (result.data && result.data.data.length === 0) {
        setSearchError('No stops found. Try a different search.');
        setSearchResults([]);
        return;
      }

      setSearchResults(result.data?.data || []);
      setShowSearchModal(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setSearchError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Retry search
  const handleRetrySearch = () => {
    setSearchError(null);
    handleSearch();
  };

  // Select destination stop
  const handleSelectStop = async (stop: StopData) => {
    // Validate stop has coordinates
    if (!stop.attributes.latitude || !stop.attributes.longitude) {
      console.warn('[MapGameScreen] Stop missing coordinates, refetching...');
      
      // Attempt to refetch stop details by ID
      try {
        const result = await getStopsByRoute(stop.id);
        if (result.ok && result.data?.data && result.data.data.length > 0) {
          const refetchedStop = result.data.data[0];
          if (refetchedStop.attributes.latitude && refetchedStop.attributes.longitude) {
            setTrip({ ...trip, selectedDestination: refetchedStop });
            setShowSearchModal(false);
            
            // Zoom to destination
            mapRef.current?.animateToRegion({
              latitude: refetchedStop.attributes.latitude,
              longitude: refetchedStop.attributes.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            return;
          }
        }
        
        Alert.alert('Error', 'Stop coordinates unavailable. Please try another stop.');
        return;
      } catch (err) {
        Alert.alert('Error', 'Could not fetch stop details. Please try another stop.');
        return;
      }
    }

    // Check if GPS is available
    if (trip.startLocation === 'current' && !userLocation) {
      Alert.alert(
        'Enable Location',
        'Please enable GPS to use "Current Location" as your starting point.',
        [{ text: 'OK' }]
      );
      return;
    }

    setTrip({ ...trip, selectedDestination: stop });
    setShowSearchModal(false);

    // Zoom to destination
    mapRef.current?.animateToRegion({
      latitude: stop.attributes.latitude,
      longitude: stop.attributes.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // Clear destination
  const handleClearDestination = () => {
    setTrip({ ...trip, selectedDestination: null });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Status pill color
  const getStatusColor = () => {
    if (!status.granted || !userLocation) return '#D32F2F'; // Red
    if (status.tracking) return '#00843D'; // Green
    return '#ED8B00'; // Orange
  };

  return (
    <View style={styles.container}>
      {/* Debug Drawer (5 taps to reveal) */}
      <DebugDrawer />

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false} // We use custom PlayerCarMarker
        showsMyLocationButton={true}
        showsCompass={true}
        onRegionChangeComplete={setRegion}
      >
        {/* Player car marker */}
        <PlayerCarMarker mapCenter={region} />
      </MapView>

      {/* Top overlay: Search */}
      <View style={styles.topOverlay}>
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Start</Text>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>📍 Current Location</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Destination</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search MBTA stops..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>🔍</Text>
              )}
            </TouchableOpacity>
          </View>

          {trip.selectedDestination && (
            <View style={styles.selectedStop}>
              <Text style={styles.selectedStopText}>
                🎯 {trip.selectedDestination.attributes.name}
              </Text>
              <TouchableOpacity onPress={handleClearDestination}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {searchError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetrySearch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Bottom overlay: Game Mode + Status */}
      <View style={styles.bottomOverlay}>
        <TouchableOpacity
          style={[styles.gameModeButton, gameMode && styles.gameModeActive]}
          onPress={() => setGameMode(!gameMode)}
        >
          <Text style={styles.gameModeText}>
            {gameMode ? '🎮 Game Mode ON' : '🗺️ Map Mode'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.statusPill, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>
            GPS: {status.tracking ? '✓' : '✗'} | 
            MBTA: ✓ | 
            Realtime: {status.tracking ? '✓' : '✗'}
          </Text>
          {status.error && (
            <Text style={styles.statusErrorText}>{status.error}</Text>
          )}
        </View>
      </View>

      {/* Search Results Modal */}
      <Modal
        visible={showSearchModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Stop</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stopItem}
                  onPress={() => handleSelectStop(item)}
                >
                  <Text style={styles.stopName}>{item.attributes.name}</Text>
                  {item.attributes.description && (
                    <Text style={styles.stopDescription}>
                      {item.attributes.description}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No stops found</Text>
              }
            />
          </View>
        </View>
      </Modal>
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
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  startButtonText: {
    fontSize: 14,
    color: '#333',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchButton: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  searchButtonText: {
    fontSize: 20,
  },
  selectedStop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedStopText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
    flex: 1,
  },
  clearButton: {
    fontSize: 20,
    color: '#666',
    paddingLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    gap: 12,
  },
  gameModeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  gameModeActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066CC',
  },
  gameModeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statusPill: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statusErrorText: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  stopItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stopDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    paddingVertical: 32,
  },
});
