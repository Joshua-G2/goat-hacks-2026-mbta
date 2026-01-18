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
  const [transferPairs, setTransferPairs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const getStopName = (stop) => {
    if (!stop) return '';
    return stop.attributes?.name || stop.name || stop;
  };

  const getTimeUntil = (targetTime) => {
    if (!targetTime) return '—';
    const now = new Date();
    const diff = Math.floor((targetTime - now) / 1000);
    
    if (diff < 0) return 'Departed';
    if (diff < 60) return `${diff}s`;
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (date) => {
    if (!date) return '—';
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

  const buildConnectionsFromPredictions = (predictionData, limit = 5) => {
    const now = new Date();
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

    const graceMs = 60 * 1000;
    return (predictionData?.data || [])
      .map((prediction) => {
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
      const direction = mapDirectionName(route, directionId);
      const arrivalTime = prediction.attributes?.arrival_time
        ? new Date(prediction.attributes.arrival_time)
        : null;
      const departureTime = prediction.attributes?.departure_time
        ? new Date(prediction.attributes.departure_time)
        : null;
      const tripId = prediction.relationships?.trip?.data?.id || null;
      const primaryTime = departureTime || arrivalTime;
      return {
        id: prediction.id,
        routeId,
        route: routeName,
        direction,
        directionId,
        arrivalTime,
        departureTime,
        status: prediction.attributes?.status || 'On time',
        platform:
          stop?.attributes?.platform_code ||
          prediction.attributes?.platform ||
          'TBD',
        tripId,
        stopId,
        primaryTime,
      };
    })
      .filter((connection) =>
        connection.primaryTime ? connection.primaryTime >= new Date(now.getTime() - graceMs) : false
      )
      .slice(0, limit);
  };

  const buildConnectionsFromSchedules = (scheduleData, limit = 5) => {
    const now = new Date();
    const graceMs = 60 * 1000;
    return (scheduleData?.data || [])
      .map((schedule) => {
      const arrivalTime = schedule.attributes?.arrival_time
        ? new Date(schedule.attributes.arrival_time)
        : null;
      const departureTime = schedule.attributes?.departure_time
        ? new Date(schedule.attributes.departure_time)
        : null;
      const primaryTime = departureTime || arrivalTime;
      return {
        id: schedule.id,
        routeId: schedule.relationships?.route?.data?.id,
        route: 'Scheduled Service',
        direction: schedule.attributes?.direction_id === 0 ? 'Outbound' : 'Inbound',
        directionId: schedule.attributes?.direction_id ?? null,
        arrivalTime,
        departureTime,
        status: 'Scheduled',
        platform: 'TBD',
        tripId: schedule.relationships?.trip?.data?.id || null,
        stopId: schedule.relationships?.stop?.data?.id || null,
        primaryTime,
      };
    })
      .filter((connection) =>
        connection.primaryTime ? connection.primaryTime >= new Date(now.getTime() - graceMs) : false
      )
      .slice(0, limit);
  };

  const buildScheduleLookup = (scheduleData) => {
    const lookup = new Map();
    (scheduleData?.data || []).forEach((schedule) => {
      const tripId = schedule.relationships?.trip?.data?.id;
      if (!tripId) return;
      const arrivalTime = schedule.attributes?.arrival_time
        ? new Date(schedule.attributes.arrival_time)
        : null;
      const departureTime = schedule.attributes?.departure_time
        ? new Date(schedule.attributes.departure_time)
        : null;
      if (!arrivalTime && !departureTime) return;
      if (!lookup.has(tripId)) {
        lookup.set(tripId, { arrivalTime, departureTime });
      }
    });
    return lookup;
  };

  const applyScheduleFallback = (connections, scheduleLookup) => {
    if (!scheduleLookup || scheduleLookup.size === 0) return connections;
    return connections.map((connection) => {
      if (!connection.tripId) return connection;
      const fallback = scheduleLookup.get(connection.tripId);
      if (!fallback) return connection;
      return {
        ...connection,
        arrivalTime: connection.arrivalTime || fallback.arrivalTime || null,
        departureTime: connection.departureTime || fallback.departureTime || null,
        primaryTime:
          connection.primaryTime ||
          fallback.departureTime ||
          fallback.arrivalTime ||
          null,
      };
    });
  };

  const filterConnectionsByDestination = (originConnections, destinationConnections) => {
    const destinationByTrip = new Map(
      destinationConnections
        .filter((connection) => connection.tripId)
        .map((connection) => [
          connection.tripId,
          connection.arrivalTime || connection.departureTime || null,
        ])
    );
    return originConnections.filter((origin) => {
      if (!origin.tripId) return false;
      const destinationTime = destinationByTrip.get(origin.tripId);
      if (!destinationTime) return false;
      const originTime = origin.departureTime || origin.arrivalTime;
      if (!originTime) return false;
      return destinationTime >= originTime;
    });
  };

  const buildTransferPairs = (originConnections, transferConnections, destinationConnections) => {
    const transferByTrip = new Map(
      transferConnections
        .filter((connection) => connection.tripId)
        .map((connection) => [connection.tripId, connection])
    );
    const destinationByTrip = new Map(
      destinationConnections
        .filter((connection) => connection.tripId)
        .map((connection) => [connection.tripId, connection])
    );

    const now = new Date();
    const graceMs = 60 * 1000;
    const originLegs = originConnections
      .map((origin) => {
        if (!origin.tripId) return null;
        const transferMatch = transferByTrip.get(origin.tripId);
        const arrivalTime = transferMatch?.arrivalTime || transferMatch?.departureTime || null;
        const departureTime = origin.departureTime || origin.arrivalTime;
        return arrivalTime
          ? {
              id: origin.id,
              route: origin.route,
              direction: origin.direction,
              directionId: origin.directionId,
              departureTime,
              arrivalTime,
            }
          : null;
      })
      .filter(
        (origin) =>
          origin &&
          origin.departureTime &&
          origin.departureTime >= new Date(now.getTime() - graceMs)
      );

    const transferLegs = transferConnections
      .map((transfer) => {
        if (!transfer.tripId) return null;
        const destinationMatch = destinationByTrip.get(transfer.tripId);
        const arrivalTime =
          destinationMatch?.arrivalTime || destinationMatch?.departureTime || null;
        return arrivalTime
          ? {
              id: transfer.id,
              route: transfer.route,
              direction: transfer.direction,
              directionId: transfer.directionId,
              departureTime: transfer.departureTime || transfer.arrivalTime,
              arrivalTime,
            }
          : null;
      })
      .filter(Boolean);

    const pairs = [];
    originLegs.forEach((originLeg) => {
      if (!originLeg.arrivalTime) return;
      transferLegs.forEach((transferLeg) => {
        if (!transferLeg.departureTime) return;
        const bufferMs = 2 * 60 * 1000;
        if (transferLeg.departureTime - originLeg.arrivalTime >= bufferMs) {
          const totalMinutes =
            originLeg.departureTime && transferLeg.arrivalTime
              ? Math.round((transferLeg.arrivalTime - originLeg.departureTime) / 60000)
              : null;
          pairs.push({
            id: `${originLeg.id}-${transferLeg.id}`,
            originLeg,
            transferLeg,
            layoverMinutes: Math.round((transferLeg.departureTime - originLeg.arrivalTime) / 60000),
            totalMinutes,
          });
        }
      });
    });

    return pairs.sort((a, b) => {
      const aTime = a.transferLeg.departureTime || a.originLeg.departureTime || 0;
      const bTime = b.transferLeg.departureTime || b.originLeg.departureTime || 0;
      return aTime - bTime;
    });
  };

  const loadConnections = async () => {
    if (!originStopId || !destinationStopId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const now = new Date();
      const maxTime = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
      if (selectedTransfer?.id) {
        const [
          originPredictions,
          transferPredictions,
          destinationPredictions,
          originSchedules,
          transferSchedules,
          destinationSchedules,
        ] = await Promise.all([
          MBTA_API.getPredictions(originStopId, {}, 'route,stop,trip'),
          MBTA_API.getPredictions(selectedTransfer.id, {}, 'route,stop,trip'),
          MBTA_API.getPredictions(destinationStopId, {}, 'route,stop,trip'),
          MBTA_API.getSchedules(originStopId, { max_time: maxTime }),
          MBTA_API.getSchedules(selectedTransfer.id, { max_time: maxTime }),
          MBTA_API.getSchedules(destinationStopId, { max_time: maxTime }),
        ]);
        const originLookup = buildScheduleLookup(originSchedules);
        const transferLookup = buildScheduleLookup(transferSchedules);
        const destinationLookup = buildScheduleLookup(destinationSchedules);

        let originConnections = applyScheduleFallback(
          buildConnectionsFromPredictions(originPredictions, 10),
          originLookup
        );
        let transferConnections = applyScheduleFallback(
          buildConnectionsFromPredictions(transferPredictions, 20),
          transferLookup
        );
        let destinationConnections = applyScheduleFallback(
          buildConnectionsFromPredictions(destinationPredictions, 20),
          destinationLookup
        );

        if (originConnections.length === 0) {
          originConnections = buildConnectionsFromSchedules(originSchedules, 10);
        }
        if (transferConnections.length === 0) {
          transferConnections = buildConnectionsFromSchedules(transferSchedules, 20);
        }
        if (destinationConnections.length === 0) {
          destinationConnections = buildConnectionsFromSchedules(destinationSchedules, 20);
        }
        const pairs = buildTransferPairs(originConnections, transferConnections, destinationConnections);
        setTransferPairs(pairs);
        setConnections([]);
      } else {
        const [
          originPredictions,
          destinationPredictions,
          originSchedules,
          destinationSchedules,
        ] = await Promise.all([
          MBTA_API.getPredictions(originStopId, {}, 'route,stop,trip'),
          MBTA_API.getPredictions(destinationStopId, {}, 'route,stop,trip'),
          MBTA_API.getSchedules(originStopId, { max_time: maxTime }),
          MBTA_API.getSchedules(destinationStopId, { max_time: maxTime }),
        ]);

        const originLookup = buildScheduleLookup(originSchedules);
        const destinationLookup = buildScheduleLookup(destinationSchedules);

        let nextConnections = applyScheduleFallback(
          buildConnectionsFromPredictions(originPredictions),
          originLookup
        );
        let destinationConnections = applyScheduleFallback(
          buildConnectionsFromPredictions(destinationPredictions, 30),
          destinationLookup
        );
        if (destinationConnections.length === 0) {
          destinationConnections = buildConnectionsFromSchedules(destinationSchedules, 30);
        }
        if (destinationConnections.length > 0) {
          nextConnections = filterConnectionsByDestination(nextConnections, destinationConnections);
        }
        if (nextConnections.length === 0) {
          nextConnections = buildConnectionsFromSchedules(originSchedules);
          if (destinationConnections.length > 0) {
            nextConnections = filterConnectionsByDestination(nextConnections, destinationConnections);
          }
        }
        setConnections(nextConnections);
        setTransferPairs([]);
      }
      onDataUpdated();
    } catch (error) {
      setLoadError('Failed to load live connections');
      setConnections([]);
      setTransferPairs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (originStopId && destinationStopId) {
      loadConnections();
    } else {
      setConnections([]);
      setTransferPairs([]);
    }
  }, [originStopId, destinationStopId, selectedTransfer?.id]);

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
            <h3>{selectedTransfer ? 'Transfer Options' : 'Next Trains'}</h3>
            {isLoading ? (
              <div className="no-connections">
                <p>Loading live connections...</p>
              </div>
            ) : loadError ? (
              <div className="no-connections">
                <p>{loadError}</p>
                <p className="hint">Try refreshing in a moment.</p>
              </div>
            ) : selectedTransfer ? (
              transferPairs.length > 0 ? (
                transferPairs.slice(0, 3).map((pair) => (
                  <div key={pair.id} className="connection-card">
                    <div className="connection-route">
                      <span className="route-name">{pair.originLeg.route}</span>
                      <span className="route-direction">
                        to {(pair.originLeg.direction || 'Outbound').toUpperCase()}
                      </span>
                    </div>
                    <div className="connection-timing">
                      <div className="time-block">
                        <div className="absolute-time">
                          Depart: <strong>{formatTime(pair.originLeg.departureTime)}</strong>
                        </div>
                        <div className="absolute-time">
                          Arrive: <strong>{formatTime(pair.originLeg.arrivalTime)}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="connection-details">
                      <span className="platform">
                        Live Countdown{' '}
                        <span className="countdown-inline">
                          {getTimeUntil(pair.originLeg.departureTime || pair.originLeg.arrivalTime)}
                        </span>
                      </span>
                    </div>
                    <div className="connection-route">
                      <span className="route-name">{pair.transferLeg.route}</span>
                      <span className="route-direction">
                        to {(pair.transferLeg.direction || 'Outbound').toUpperCase()}
                      </span>
                    </div>
                    <div className="connection-timing">
                      <div className="time-block">
                        <div className="absolute-time">
                          Depart: <strong>{formatTime(pair.transferLeg.departureTime)}</strong>
                        </div>
                        <div className="absolute-time">
                          Arrive: <strong>{formatTime(pair.transferLeg.arrivalTime)}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="connection-details">
                      <span className="platform">
                        Live Countdown{' '}
                        <span className="countdown-inline">
                          {getTimeUntil(pair.transferLeg.departureTime || pair.transferLeg.arrivalTime)}
                        </span>
                      </span>
                      {pair.totalMinutes !== null && (
                        <span className="status on-time">
                          {pair.totalMinutes}m total
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-connections">
                  <p>No valid transfer pairs found</p>
                  <p className="hint">Check back in a moment...</p>
                </div>
              )
            ) : connections.length > 0 ? (
              connections.map((connection) => (
                <div key={connection.id} className="connection-card">
                  <div className="connection-route">
                    <span className="route-name">{connection.route}</span>
                    <span className="route-direction">
                      to {(connection.direction || 'Outbound').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="connection-timing">
                    <div className="time-block">
                      <div className="absolute-time">
                        Depart: <strong>{formatTime(connection.departureTime)}</strong>
                      </div>
                      <div className="absolute-time">
                        Arrive: <strong>{formatTime(connection.arrivalTime)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="connection-details">
                    <span className="platform">
                      Live Countdown{' '}
                      <span className="countdown-inline">
                        {getTimeUntil(connection.departureTime || connection.arrivalTime)}
                      </span>
                    </span>
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
