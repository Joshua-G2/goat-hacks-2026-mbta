import { useState, useEffect } from 'react';
import './DailyTasksPanel.css';

const DAILY_TASKS = [
  {
    id: 'rides_2',
    title: '🚇 Complete 2 Train Rides',
    description: 'Take 2 different train rides today',
    points: 100,
    requirement: { type: 'rides', count: 2 },
    icon: '🎫'
  },
  {
    id: 'lines_visit',
    title: '🌈 Visit All Line Colors',
    description: 'Visit at least one stop on Red, Orange, Blue, and Green lines',
    points: 250,
    requirement: { type: 'lines', colors: ['Red', 'Orange', 'Blue', 'Green-B'] },
    icon: '🎨'
  },
  {
    id: 'hub_master',
    title: '⭐ Hub Master',
    description: 'Visit a station where multiple lines meet (e.g., Park Street, Downtown Crossing)',
    points: 150,
    requirement: { type: 'hub' },
    icon: '🏛️'
  },
  {
    id: 'explorer',
    title: '🗺️ Explorer',
    description: 'Travel at least 5 miles on MBTA today',
    points: 200,
    requirement: { type: 'distance', miles: 5 },
    icon: '🧭'
  },
  {
    id: 'early_bird',
    title: '🌅 Early Bird',
    description: 'Take a train before 7 AM',
    points: 120,
    requirement: { type: 'time', before: 7 },
    icon: '☀️'
  },
  {
    id: 'night_owl',
    title: '🌙 Night Owl',
    description: 'Take a train after 10 PM',
    points: 120,
    requirement: { type: 'time', after: 22 },
    icon: '🦉'
  },
  {
    id: 'quick_transfer',
    title: '⚡ Speed Demon',
    description: 'Complete a transfer in under 2 minutes',
    points: 180,
    requirement: { type: 'transfer_speed', maxSeconds: 120 },
    icon: '💨'
  },
  {
    id: 'social',
    title: '👥 Social Butterfly',
    description: 'Ride with 3 or more other players nearby',
    points: 150,
    requirement: { type: 'social', count: 3 },
    icon: '🦋'
  }
];

function DailyTasksPanel({ progress, onClaimReward }) {
  const [tasks, setTasks] = useState([]);
  const [expandedTask, setExpandedTask] = useState(null);

  useEffect(() => {
    // Randomly select 4 tasks for today
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('dailyTasksDate');
    
    if (savedDate !== today) {
      const shuffled = [...DAILY_TASKS].sort(() => Math.random() - 0.5);
      const selectedTasks = shuffled.slice(0, 4);
      localStorage.setItem('dailyTasks', JSON.stringify(selectedTasks));
      localStorage.setItem('dailyTasksDate', today);
      setTasks(selectedTasks);
    } else {
      const saved = localStorage.getItem('dailyTasks');
      setTasks(saved ? JSON.parse(saved) : []);
    }
  }, []);

  const getTaskProgress = (task) => {
    if (!progress) return 0;
    
    switch (task.requirement.type) {
      case 'rides':
        return Math.min(100, (progress.ridesCount / task.requirement.count) * 100);
      case 'lines': {
        const visitedLines = progress.visitedLines || [];
        return Math.min(100, (visitedLines.length / task.requirement.colors.length) * 100);
      }
      case 'hub':
        return progress.visitedHub ? 100 : 0;
      case 'distance':
        return Math.min(100, (progress.miles / task.requirement.miles) * 100);
      case 'time':
        return progress[task.id] ? 100 : 0;
      case 'transfer_speed':
        return progress.fastTransfer ? 100 : 0;
      case 'social':
        return progress.socialCount >= task.requirement.count ? 100 : 0;
      default:
        return 0;
    }
  };

  const isTaskComplete = (task) => getTaskProgress(task) === 100;
  const isTaskClaimed = (task) => {
    const claimed = JSON.parse(localStorage.getItem('claimedTasks') || '[]');
    return claimed.includes(task.id);
  };

  const handleClaim = (task) => {
    const claimed = JSON.parse(localStorage.getItem('claimedTasks') || '[]');
    claimed.push(task.id);
    localStorage.setItem('claimedTasks', JSON.stringify(claimed));
    onClaimReward?.(task.points);
    setTasks([...tasks]); // Force re-render
  };

  const completedCount = tasks.filter(t => isTaskComplete(t)).length;

  return (
    <div className="daily-tasks-panel">
      <div className="tasks-header">
        <div className="tasks-title">
          <span className="tasks-icon">📋</span>
          <h3>Daily Tasks</h3>
        </div>
        <div className="tasks-progress">
          <span className="completed-count">{completedCount}/{tasks.length}</span>
          <div className="progress-ring">
            <svg width="40" height="40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#4CAF50"
                strokeWidth="3"
                strokeDasharray={`${(completedCount / tasks.length) * 100} 100`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="tasks-list">
        {tasks.map((task) => {
          const progressPercent = getTaskProgress(task);
          const completed = isTaskComplete(task);
          const claimed = isTaskClaimed(task);
          const expanded = expandedTask === task.id;

          return (
            <div
              key={task.id}
              className={`task-card ${completed ? 'completed' : ''} ${claimed ? 'claimed' : ''} ${expanded ? 'expanded' : ''}`}
              onClick={() => setExpandedTask(expanded ? null : task.id)}
            >
              <div className="task-icon-wrapper">
                <div className="task-icon">{task.icon}</div>
                {completed && !claimed && (
                  <div className="completion-badge">✓</div>
                )}
              </div>
              
              <div className="task-content">
                <div className="task-header-row">
                  <h4 className="task-title">{task.title}</h4>
                  <div className="task-points">+{task.points} pts</div>
                </div>
                
                <p className="task-description">{task.description}</p>
                
                <div className="task-progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progressPercent}%` }}
                  />
                  <span className="progress-text">{Math.round(progressPercent)}%</span>
                </div>

                {expanded && (
                  <div className="task-details">
                    {completed && !claimed && (
                      <button 
                        className="claim-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(task);
                        }}
                      >
                        🎁 Claim Reward
                      </button>
                    )}
                    {claimed && (
                      <div className="claimed-badge">✅ Claimed!</div>
                    )}
                    {!completed && (
                      <div className="requirement-hint">
                        Keep going! You're {Math.round(progressPercent)}% there!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedCount === tasks.length && (
        <div className="all-complete-banner">
          <div className="banner-content">
            <span className="trophy">🏆</span>
            <div>
              <h4>All Tasks Complete!</h4>
              <p>Come back tomorrow for new challenges</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyTasksPanel;
