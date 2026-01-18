import React, { useState } from 'react';
import ConfidenceIndicator from './ConfidenceIndicator';
import './TransferGuidance.css';

function TransferGuidance({
  selectedOrigin,
  selectedDestination,
  transferStation,
  transferStations = [],
  originRouteId,
  destinationRouteId,
  walkingSpeed = 'normal'
}) {
  const [speed, setSpeed] = useState(walkingSpeed);
  const transferName = transferStation?.attributes?.name || transferStation?.name || transferStation;
  const originName = selectedOrigin?.attributes?.name || selectedOrigin?.name || selectedOrigin;
  const destinationName = selectedDestination?.attributes?.name || selectedDestination?.name || selectedDestination;
  const hasEndpoints = Boolean(originName && destinationName);

  const getRouteIdsForStop = (stop) => {
    const routeData =
      stop?.relationships?.routes?.data ||
      stop?.relationships?.route?.data ||
      stop?.routeIds;
    if (!routeData) return [];
    if (Array.isArray(routeData)) {
      return routeData.map((route) => route.id || route).filter(Boolean);
    }
    return routeData.id ? [routeData.id] : [];
  };

  const getSharedRoutes = () => {
    const originRoutes = new Set(getRouteIdsForStop(selectedOrigin));
    const destinationRoutes = getRouteIdsForStop(selectedDestination);
    return destinationRoutes.filter((routeId) => originRoutes.has(routeId));
  };

  const getRouteGroup = (routeId) => {
    const id = routeId?.toLowerCase() || '';
    if (id.includes('mattapan')) return 'mattapan';
    if (id.startsWith('red')) return 'red';
    if (id.startsWith('orange')) return 'orange';
    if (id.startsWith('blue')) return 'blue';
    if (id.startsWith('green')) return 'green';
    if (id.startsWith('cr-') || id.startsWith('commuter')) return 'commuter';
    return null;
  };

  const getSharedGroups = () => {
    const originGroups = new Set(getRouteIdsForStop(selectedOrigin).map(getRouteGroup).filter(Boolean));
    return getRouteIdsForStop(selectedDestination)
      .map(getRouteGroup)
      .filter((group) => group && originGroups.has(group));
  };

  const getRouteGroupsForStop = (stop) => {
    return getRouteIdsForStop(stop).map(getRouteGroup).filter(Boolean);
  };

  const sharedRoutes = hasEndpoints ? getSharedRoutes() : [];
  const sharedGroups = hasEndpoints ? getSharedGroups() : [];
  const originGroups = new Set(getRouteGroupsForStop(selectedOrigin));
  const destinationGroups = new Set(getRouteGroupsForStop(selectedDestination));
  const originRouteGroup = getRouteGroup(originRouteId);
  const destinationRouteGroup = getRouteGroup(destinationRouteId);

  if (originRouteGroup) originGroups.add(originRouteGroup);
  if (destinationRouteGroup) destinationGroups.add(destinationRouteGroup);

  const hasSameLine =
    Boolean(originRouteId && destinationRouteId && originRouteId === destinationRouteId) ||
    (originRouteGroup && destinationRouteGroup && originRouteGroup === destinationRouteGroup) ||
    sharedRoutes.length > 0 ||
    sharedGroups.length > 0;

  const hasTransferBetweenStops = () => {
    return transferStations.some((station) => {
      const stationGroups = getRouteGroupsForStop(station);
      const connectsOrigin = stationGroups.some((group) => originGroups.has(group));
      const connectsDestination = stationGroups.some((group) => destinationGroups.has(group));
      return connectsOrigin && connectsDestination;
    });
  };

  const hasTransfer = hasEndpoints && !hasSameLine && hasTransferBetweenStops();
  
  const speedMultipliers = {
    slow: 0.6,
    normal: 1.0,
    fast: 1.3,
  };

  const baseTransferTime = 180;
  const calculatedTime = Math.round(baseTransferTime / speedMultipliers[speed]);
  const confidenceBufferBySpeed = {
    slow: 30,
    normal: 120,
    fast: 240,
  };
  const confidenceConnection = {
    arrivalTime: calculatedTime + confidenceBufferBySpeed[speed],
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="transfer-guidance">
      <h2>Transfer Guidance</h2>
      
      {hasEndpoints ? (
        <>
          <div className="transfer-info">
            <h3>
              {hasSameLine
                ? `No transfer needed`
                : transferName
                  ? `Transfer at: ${transferName}`
                  : hasTransfer
                    ? `Transfer required`
                    : `No Transfer Available`}
            </h3>
            {!hasSameLine && !transferName && !hasTransfer && (
              <div className="transfer-unavailable-note">
                Consider walking or using the T-buses
              </div>
            )}
            {hasSameLine ? (
              <div className="total-transfer-time">
                <strong>
                  {originName} → {destinationName} (same line)
                </strong>
              </div>
            ) : hasTransfer ? (
              <>
                <div className="transfer-confidence">
                  <ConfidenceIndicator
                    connection={confidenceConnection}
                    transferTime={calculatedTime}
                    walkingTime={calculatedTime}
                  />
                </div>
              </>
            ) : null}
          </div>

          {!hasSameLine && hasTransfer && (
            <>
              <div className="walking-speed-control">
                <label htmlFor="walk-speed">
                  <span>🚶 Walking Speed:</span>
                </label>
                <div className="speed-options">
                  <button 
                    className={`speed-btn ${speed === 'slow' ? 'active' : ''}`}
                    onClick={() => setSpeed('slow')}
                  >
                    Slow
                  </button>
                  <button 
                    className={`speed-btn ${speed === 'normal' ? 'active' : ''}`}
                    onClick={() => setSpeed('normal')}
                  >
                    Normal
                  </button>
                  <button 
                    className={`speed-btn ${speed === 'fast' ? 'active' : ''}`}
                    onClick={() => setSpeed('fast')}
                  >
                    Fast
                  </button>
                </div>
                <p className="speed-description">
                  {speed === 'slow' && '3 km/h - Taking it easy, carrying luggage, or mobility considerations'}
                  {speed === 'normal' && '5 km/h - Average walking pace'}
                  {speed === 'fast' && '6.5 km/h - Brisk walk, in a hurry'}
                </p>
              </div>

              <div className="total-transfer-time">
                <strong>Estimated Transfer Time: {formatTime(calculatedTime)}</strong>
              </div>

              <div className="accessibility-info">
                <h4>♿ Accessibility</h4>
                <ul>
                  <li>✅ Elevator available</li>
                  <li>✅ Escalator available</li>
                  <li>⚠️ May be crowded during rush hours (7-9 AM, 5-7 PM)</li>
                </ul>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="no-transfer-selected">
          <p>Select origin and destination to see live connections</p>
        </div>
      )}
    </div>
  );
}

export default TransferGuidance;
