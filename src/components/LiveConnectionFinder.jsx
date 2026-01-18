import React, { useEffect, useMemo, useState } from 'react';
import './LiveConnectionFinder.css';
import MBTA_API from '../config/mbtaApi';

function LiveConnectionFinder({
  selectedOrigin,
  selectedTransfer,
  selectedDestination,
  selectedOriginId,
  selectedDestinationId,
  lastUpdatedAt,
  onDataUpdated = () => {},
}) {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const getStopName = (stop) => {
    if (!stop) return '';
    return stop.attributes?.name || stop.name || stop;
  };

  const getTimeUntil = (arrivalTime) => {
    const now = new Date();
    const diff = Math.floor((arrivalTime - now) / 1000);
    
    if (diff < 0) return 'Departed';
    if (diff < 60) return `${diff}s`;
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const originStopId = selectedOriginId || selectedOrigin?.id || null;
  const destinationStopId = selectedDestinationId || selectedDestination?.id || null;

  const routeLookup = useMemo(() => {
    return new Map(connections.map((connection) => [connection.routeId, connection.route]));
  }, [connections]);

  const mapDirectionName = (route, directionId) => {
    const directionNames = route?.attributes?.direction_names;
    if (!Array.isArray(directionNames)) return directionId === 0 ? 'Outbound' : 'Inbound';
    return directionNames[directionId] || directionNames[0] || 'Outbound';
  };

  const buildConnectionsFromPredictions = (predictionData) => {
    const includedRoutes = new Map(
      (predictionData?.included || [])
        .filter((item) => item.type === 'route')
        .map((route) => [route.id, route])
    );
    const includedStops = new Map(
      (predictionData?.included || [])
        .filter((item) => item.type === 'stop')
        .map((stop) => [stop.id, stop])
    );

    return (predictionData?.data || []).slice(0, 5).map((prediction) => {
      const routeId = prediction.relationships?.route?.data?.id;
      const route = routeId ? includedRoutes.get(routeId) : null;
      const stopId = prediction.relationships?.stop?.data?.id;
      const stop = stopId ? includedStops.get(stopId) : null;
      const routeName =
        route?.attributes?.long_name ||
        route?.attributes?.short_name ||
        prediction.attributes?.route_short_name ||
        'MBTA';
      const directionId = prediction.attributes?.direction_id ?? 0;
      const arrivalTime =
        prediction.attributes?.arrival_time ||
        prediction.attributes?.departure_time ||
        new Date().toISOString();
      return {
        id: prediction.id,
        routeId,
        route: routeName,
        direction: mapDirectionName(route, directionId),
        arrivalTime: new Date(arrivalTime),
        status: prediction.attributes?.status || 'On time',
        platform:
          stop?.attributes?.platform_code ||
          prediction.attributes?.platform ||
          'TBD',
      };
    });
  };

  const buildConnectionsFromSchedules = (scheduleData) => {
    return (scheduleData?.data || []).slice(0, 5).map((schedule) => {
      const departureTime =
        schedule.attributes?.arrival_time || schedule.attributes?.departure_time;
      return {
        id: schedule.id,
        routeId: schedule.relationships?.route?.data?.id,
        route: 'Scheduled Service',
        direction: schedule.attributes?.direction_id === 0 ? 'Outbound' : 'Inbound',
        arrivalTime: new Date(departureTime),
        status: 'Scheduled',
        platform: 'TBD',
      };
    });
  };

  const loadConnections = async () => {
    if (!originStopId || !destinationStopId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const predictions = await MBTA_API.getPredictions(originStopId, {}, 'route,stop');
      let nextConnections = buildConnectionsFromPredictions(predictions);
      if (nextConnections.length === 0) {
        const schedules = await MBTA_API.getSchedules(originStopId);
        nextConnections = buildConnectionsFromSchedules(schedules);
      }
      setConnections(nextConnections);
      onDataUpdated();
    } catch (error) {
      setLoadError('Failed to load live connections');
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (originStopId && destinationStopId) {
      loadConnections();
    } else {
      setConnections([]);
    }
  }, [originStopId, destinationStopId]);

  return (
    <div className="live-connection-finder">
      <div className="finder-header">
        <h2>📡 Live Connections</h2>
        <div className="last-update">
          Last updated: {lastUpdatedAt.toLocaleTimeString()}
        </div>
      </div>

      {selectedOrigin && selectedDestination ? (
        <>
          <div className="route-summary">
            <div className="route-point">
              <span className="point-label">From</span>
              <span className="point-name">{getStopName(selectedOrigin)}</span>
            </div>
            {selectedTransfer && (
              <>
                <span className="route-arrow">→</span>
                <div className="route-point">
                  <span className="point-label">Transfer</span>
                  <span className="point-name">{getStopName(selectedTransfer)}</span>
                </div>
              </>
            )}
            <span className="route-arrow">→</span>
            <div className="route-point">
              <span className="point-label">To</span>
              <span className="point-name">{getStopName(selectedDestination)}</span>
            </div>
          </div>

          <div className="connections-list">
            <h3>Next Trains</h3>
            {isLoading ? (
              <div className="no-connections">
                <p>Loading live connections...</p>
              </div>
            ) : loadError ? (
              <div className="no-connections">
                <p>{loadError}</p>
                <p className="hint">Try refreshing in a moment.</p>
              </div>
            ) : connections.length > 0 ? (
              connections.map((connection) => (
                <div key={connection.id} className="connection-card">
                  <div className="connection-route">
                    <span className="route-name">{connection.route}</span>
                    <span className="route-direction">to {connection.direction}</span>
                  </div>
                  
                  <div className="connection-timing">
                    <div className="countdown">
                      {getTimeUntil(connection.arrivalTime)}
                    </div>
                    <div className="absolute-time">
                      {formatTime(connection.arrivalTime)}
                    </div>
                  </div>

                  <div className="connection-details">
                    <span className="platform">{connection.platform}</span>
                    <span className={`status ${connection.status.includes('Delayed') ? 'delayed' : 'on-time'}`}>
                      {connection.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-connections">
                <p>No upcoming trains found</p>
                <p className="hint">Check back in a moment...</p>
              </div>
            )}
          </div>

          <button className="refresh-btn" onClick={loadConnections} disabled={isLoading}>
            🔄 Refresh Predictions
          </button>
        </>
      ) : (
        <div className="no-route-selected">
          <p>Select origin and destination to see live connections</p>
        </div>
      )}
    </div>
  );
}

export default LiveConnectionFinder;
