import { useState, useEffect } from 'react';
import { cn } from "../lib/utils";

export default function ExpenseTracker({ totalPoints = 0 }) {
  const [dailyPoints, setDailyPoints] = useState(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('dailyPoints');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    // Update today's points
    const today = new Date().toLocaleDateString();
    
    setDailyPoints(prevPoints => {
      const updated = [...prevPoints];
      const todayIndex = updated.findIndex(d => d.date === today);
      
      if (todayIndex >= 0) {
        updated[todayIndex].points = totalPoints;
      } else {
        updated.push({ date: today, points: totalPoints });
      }
      
      // Keep only last 7 days
      const last7Days = updated.slice(-7);
      localStorage.setItem('dailyPoints', JSON.stringify(last7Days));
      return last7Days;
    });
  }, [totalPoints]);

  const maxPoints = Math.max(...dailyPoints.map(d => d.points), 1);

  return (
    <div className={cn(
      "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50 shadow-2xl"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Points Tracker</h3>
        <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          {totalPoints}
        </div>
      </div>
      
      <div className="flex items-end justify-between gap-2 h-32">
        {dailyPoints.map((day, i) => {
          const height = (day.points / maxPoints) * 100;
          const isToday = day.date === new Date().toLocaleDateString();
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-slate-700/30 rounded-t-lg overflow-hidden flex items-end" style={{ height: '100px' }}>
                <div 
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-500",
                    isToday 
                      ? "bg-gradient-to-t from-yellow-500 to-orange-500 animate-pulse" 
                      : "bg-gradient-to-t from-blue-500 to-purple-500"
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={cn(
                "text-xs",
                isToday ? "text-yellow-400 font-bold" : "text-slate-400"
              )}>
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center text-sm text-slate-400">
        Last 7 Days Activity
      </div>
    </div>
  );
}
