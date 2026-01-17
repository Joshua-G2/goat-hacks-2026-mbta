import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { MapGameScreen } from '@screens/MapGameScreen';
import { getRoutes } from '@api/mbtaClient';
import { assertContracts } from '@utils/contracts';
import { startSupervisor, stopSupervisor } from '@services/supervisor';

export default function App() {
  useEffect(() => {
    // Run contract validation on startup
    assertContracts();

    // Start supervisor loop
    startSupervisor({
      restartGPS: async () => {
        // GPS restart handled by useLiveLocation hook
        console.log('[App] GPS restart requested by supervisor');
      },
      refreshMBTA: async () => {
        // MBTA refresh handled by useLiveMbta hook
        console.log('[App] MBTA refresh requested by supervisor');
      },
      regenerateTripPlan: async (destinationStopId: string) => {
        console.log('[App] Trip plan regeneration requested by supervisor');
        // Trip plan regeneration handled by MapGameScreen
      },
      regenerateTasks: async (tripPlan: any, preserveCompleted: boolean) => {
        console.log('[App] Task regeneration requested by supervisor');
        // Task regeneration handled by MapGameScreen
      },
    });

    // Log MBTA routes on boot
    const logRoutes = async () => {
      try {
        console.log('🚇 Fetching MBTA routes...');
        const result = await getRoutes();
        
        if (!result.ok) {
          console.error('❌ Failed to fetch MBTA routes:', result.error);
          return;
        }
        
        console.log(`✅ Successfully fetched ${result.data!.data.length} MBTA routes from /routes`);
        
        // Log first 5 routes as sample
        result.data!.data.slice(0, 5).forEach((route) => {
          console.log(`  - ${route.attributes.long_name} (${route.attributes.type})`);
        });
      } catch (error) {
        console.error('❌ Failed to fetch MBTA routes:', error);
      }
    };

    logRoutes();

    // Cleanup on unmount
    return () => {
      stopSupervisor();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MapGameScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
