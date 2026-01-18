import { useState } from 'react';
import { EVENT_TYPES } from '../utils/gameHelpers';
import './EventReportOverlay.css';

function EventReportOverlay({ userLocation, onReportEvent }) {
  const [showEventMenu, setShowEventMenu] = useState(false);

  const handleReportEvent = (eventType) => {
    if (!onReportEvent || !userLocation) return;
    onReportEvent(eventType, userLocation);
    setShowEventMenu(false);
  };

  return (
    <div className="event-report-overlay">
      <button
        className="report-button"
        onClick={() => setShowEventMenu((prev) => !prev)}
      >
        📢 Report Event
      </button>

      {showEventMenu && (
        <div className="event-menu">
          {Object.entries(EVENT_TYPES).map(([key, config]) => (
            <button
              key={key}
              className="event-option"
              onClick={() => handleReportEvent(key)}
            >
              <span className="event-icon">{config.icon}</span>
              {config.type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EventReportOverlay;
