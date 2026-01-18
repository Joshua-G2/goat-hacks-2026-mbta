import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { getSupervisorState, clearLogs } from '@services/supervisor';
import type { SupervisorState } from '@services/supervisor';

export const DebugDrawer: React.FC = () => {
  const [tapCount, setTapCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [supervisorState, setSupervisorState] = useState<SupervisorState | null>(null);

  // Reset tap count after 2 seconds
  useEffect(() => {
    if (tapCount > 0 && tapCount < 5) {
      const timeout = setTimeout(() => setTapCount(0), 2000);
      return () => clearTimeout(timeout);
    }
  }, [tapCount]);

  // Open drawer after 5 taps
  useEffect(() => {
    if (tapCount >= 5) {
      setShowDrawer(true);
      setTapCount(0);
      updateState();
    }
  }, [tapCount]);

  // Update state every second when drawer is open
  useEffect(() => {
    if (showDrawer) {
      const interval = setInterval(updateState, 1000);
      return () => clearInterval(interval);
    }
  }, [showDrawer]);

  const updateState = () => {
    setSupervisorState(getSupervisorState());
  };

  const handleTap = () => {
    setTapCount((prev) => prev + 1);
  };

  const handleClose = () => {
    setShowDrawer(false);
  };

  const handleClearLogs = () => {
    clearLogs();
    updateState();
  };

  const getHealthEmoji = (healthy: boolean) => (healthy ? '✅' : '❌');

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const ago = Date.now() - timestamp;
    if (ago < 1000) return 'Just now';
    if (ago < 60000) return `${Math.floor(ago / 1000)}s ago`;
    if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
    return `${Math.floor(ago / 3600000)}h ago`;
  };

  return (
    <>
      {/* Hidden tap area in top-right corner */}
      <Pressable
        style={styles.tapArea}
        onPress={handleTap}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        {tapCount > 0 && tapCount < 5 && (
          <View style={styles.tapIndicator}>
            <Text style={styles.tapText}>{tapCount}/5</Text>
          </View>
        )}
      </Pressable>

      {/* Debug Drawer Modal */}
      <Modal
        visible={showDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🔧 Debug Dashboard</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
              {supervisorState && (
                <>
                  {/* System Health */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System Health</Text>
                    
                    <View style={styles.healthRow}>
                      <Text style={styles.healthLabel}>
                        {getHealthEmoji(supervisorState.health.gps.active && supervisorState.health.gps.valid && !supervisorState.health.gps.stale)} GPS
                      </Text>
                      <Text style={styles.healthValue}>
                        {supervisorState.health.gps.active ? '🟢' : '🔴'} Active |{' '}
                        {supervisorState.health.gps.valid ? '✓' : '✗'} Valid |{' '}
                        {supervisorState.health.gps.stale ? '⏰' : '🔄'} {formatTimestamp(supervisorState.health.gps.lastUpdate)}
                      </Text>
                    </View>

                    <View style={styles.healthRow}>
                      <Text style={styles.healthLabel}>
                        {getHealthEmoji(supervisorState.health.mbta.polling && !supervisorState.health.mbta.stale)} MBTA
                      </Text>
                      <Text style={styles.healthValue}>
                        {supervisorState.health.mbta.polling ? '🟢' : '🔴'} Polling |{' '}
                        {supervisorState.health.mbta.stale ? '⏰' : '🔄'} {formatTimestamp(supervisorState.health.mbta.lastUpdate)}
                      </Text>
                    </View>

                    <View style={styles.healthRow}>
                      <Text style={styles.healthLabel}>
                        {getHealthEmoji(supervisorState.health.tripPlan.valid)} Trip Plan
                      </Text>
                      <Text style={styles.healthValue}>
                        {supervisorState.health.tripPlan.hasLegs ? '✓' : '✗'} Legs |{' '}
                        {supervisorState.health.tripPlan.idsPresent ? '✓' : '✗'} IDs
                      </Text>
                    </View>

                    <View style={styles.healthRow}>
                      <Text style={styles.healthLabel}>
                        {getHealthEmoji(supervisorState.health.tasks.synced)} Tasks
                      </Text>
                      <Text style={styles.healthValue}>
                        {supervisorState.health.tasks.count} active |{' '}
                        {supervisorState.health.tasks.synced ? '✓' : '✗'} Synced
                      </Text>
                    </View>
                  </View>

                  {/* Recent Auto-Fixes */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        Recent Auto-Fixes ({supervisorState.lastAutoFix.length})
                      </Text>
                    </View>
                    {supervisorState.lastAutoFix.length === 0 ? (
                      <Text style={styles.emptyText}>No auto-fixes yet</Text>
                    ) : (
                      supervisorState.lastAutoFix.slice(-5).reverse().map((fix: any, index: number) => (
                        <View key={index} style={styles.logRow}>
                          <Text style={styles.logTimestamp}>
                            {formatTimestamp(fix.timestamp)}
                          </Text>
                          <Text style={styles.logMessage}>
                            {fix.success ? '✅' : '❌'} [{fix.category}] {fix.issue} → {fix.action}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Errors */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        Errors ({supervisorState.errors.length})
                      </Text>
                    </View>
                    {supervisorState.errors.length === 0 ? (
                      <Text style={styles.emptyText}>No errors</Text>
                    ) : (
                      supervisorState.errors.slice(-5).reverse().map((log: any, index: number) => (
                        <View key={index} style={styles.logRow}>
                          <Text style={styles.logTimestamp}>
                            {formatTimestamp(log.timestamp)}
                          </Text>
                          <Text style={[styles.logMessage, styles.errorText]}>
                            [{log.category}] {log.message}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Warnings */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        Warnings ({supervisorState.warnings.length})
                      </Text>
                    </View>
                    {supervisorState.warnings.length === 0 ? (
                      <Text style={styles.emptyText}>No warnings</Text>
                    ) : (
                      supervisorState.warnings.slice(-5).reverse().map((log: any, index: number) => (
                        <View key={index} style={styles.logRow}>
                          <Text style={styles.logTimestamp}>
                            {formatTimestamp(log.timestamp)}
                          </Text>
                          <Text style={[styles.logMessage, styles.warningText]}>
                            [{log.category}] {log.message}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleClearLogs}
                    >
                      <Text style={styles.actionButtonText}>🗑️ Clear Logs</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tapArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    zIndex: 9999,
  },
  tapIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tapText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
  },
  scrollView: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  healthValue: {
    fontSize: 12,
    color: '#666',
  },
  logRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 12,
    color: '#333',
  },
  errorText: {
    color: '#D32F2F',
  },
  warningText: {
    color: '#ED8B00',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
