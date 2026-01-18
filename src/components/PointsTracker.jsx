import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import AnimatedBorderTrail from './AnimatedBorderTrail';
import AnimatedGradientText from './AnimatedGradientText';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import { MBTA_TOKEN_SYMBOL } from '../config/solanaConfig';

export default function PointsTracker({ currentPoints = 0 }) {
  const [allTimePoints, setAllTimePoints] = useState(() => {
    const stored = localStorage.getItem('allTimePoints');
    return stored ? parseInt(stored) : 0;
  });
  const [todayPoints, setTodayPoints] = useState(() => {
    const today = new Date().toLocaleDateString();
    const dailyData = localStorage.getItem('dailyPointsData');
    if (dailyData) {
      try {
        const parsed = JSON.parse(dailyData);
        const todayData = parsed.find(d => d.date === today);
        return todayData?.points || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });
  const lastProcessedPoints = useRef(0);

  useEffect(() => {
    // Only process new points
    if (currentPoints > lastProcessedPoints.current) {
      const pointsToAdd = currentPoints - lastProcessedPoints.current;
      lastProcessedPoints.current = currentPoints;

      // Update all-time points
      setAllTimePoints(prev => {
        const newTotal = prev + pointsToAdd;
        localStorage.setItem('allTimePoints', newTotal.toString());
        return newTotal;
      });

      // Update today's points
      const today = new Date().toLocaleDateString();
      let dailyData = localStorage.getItem('dailyPointsData');
      dailyData = dailyData ? JSON.parse(dailyData) : [];
      
      const todayIndex = dailyData.findIndex(d => d.date === today);
      if (todayIndex >= 0) {
        dailyData[todayIndex].points += pointsToAdd;
      } else {
        dailyData.push({ date: today, points: pointsToAdd });
      }
      
      setTodayPoints(dailyData.find(d => d.date === today)?.points || 0);
      localStorage.setItem('dailyPointsData', JSON.stringify(dailyData.slice(-30))); // Keep last 30 days
    }
  }, [currentPoints]);

  // Get Solana wallet balance
  const { mbtaBalance, isLoading: walletLoading, connected } = useSolanaBalance();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {/* Current Session */}
      <AnimatedBorderTrail
        trailColor="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-500"
        className="backdrop-blur-xl"
      >
        <div className="bg-white/90 px-6 py-3 rounded-xl border border-primary-200/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-primary-600 text-2xl">⚡</div>
            <div>
              <div className="text-xs text-slate-500 font-sans uppercase tracking-wider font-medium">Session</div>
              <AnimatedGradientText className="text-2xl font-display font-bold">
                {currentPoints}
              </AnimatedGradientText>
            </div>
          </div>
        </div>
      </AnimatedBorderTrail>

      {/* Today's Total */}
      <AnimatedBorderTrail
        trailColor="bg-gradient-to-r from-success-400 via-primary-400 to-success-500"
        className="backdrop-blur-xl"
      >
        <div className="bg-white/90 px-6 py-3 rounded-xl border border-success-200/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-success-600 text-2xl">🎯</div>
            <div>
              <div className="text-xs text-slate-500 font-sans uppercase tracking-wider font-medium">Today</div>
              <div className="text-2xl font-display font-bold text-success-600">
                {todayPoints}
              </div>
            </div>
          </div>
        </div>
      </AnimatedBorderTrail>

      {/* All-Time Total */}
      <AnimatedBorderTrail
        trailColor="bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600"
        className="backdrop-blur-xl"
      >
        <div className="bg-white/90 px-6 py-3 rounded-xl border border-accent-200/30 shadow-lg">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-accent-600" size={24} />
            <div>
              <div className="text-xs text-slate-500 font-sans uppercase tracking-wider font-medium">All-Time</div>
              <div className="text-2xl font-display font-bold text-accent-600">
                {allTimePoints.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </AnimatedBorderTrail>

      {/* Wallet Balance - Solana Integration */}
      {connected && (
        <AnimatedBorderTrail
          trailColor="bg-gradient-to-r from-pink-400 via-purple-500 to-pink-600"
          className="backdrop-blur-xl"
        >
          <div className="bg-white/90 px-6 py-3 rounded-xl border border-pink-200/30 shadow-lg">
            <div className="flex items-center gap-3">
              <Wallet className="text-pink-600" size={24} />
              <div>
                <div className="text-xs text-slate-500 font-sans uppercase tracking-wider font-medium">Wallet</div>
                <div className="text-2xl font-display font-bold text-pink-600">
                  {walletLoading ? (
                    <span className="text-base">Loading...</span>
                  ) : (
                    <>
                      {mbtaBalance.toLocaleString()} 
                      <span className="text-sm ml-1 text-purple-600">{MBTA_TOKEN_SYMBOL}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AnimatedBorderTrail>
      )}
    </div>
  );
}
