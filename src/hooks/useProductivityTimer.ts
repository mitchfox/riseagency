import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface ProductivityTimerOptions {
  totalActions: number;
  scoredCount: number;
}

export const useProductivityTimer = ({ totalActions, scoredCount }: ProductivityTimerOptions) => {
  const [, setTick] = useState(0);
  const startTimeRef = useRef(Date.now());
  const startScoredRef = useRef(scoredCount);

  // Force re-render every 200ms for smooth ticking (avoids browser throttling of 1s intervals)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(interval);
  }, []);

  // Derive elapsed from wall clock on every render – always accurate
  const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const actionsThisSession = Math.max(0, scoredCount - startScoredRef.current);
  const remaining = totalActions - scoredCount;

  const message = useMemo(() => {
    if (actionsThisSession < 1) return `Elapsed ${elapsedSeconds}s · ${remaining} left`;

    const avgSecsPerAction = elapsedSeconds / actionsThisSession;
    const estSecsLeft = avgSecsPerAction * Math.max(0, remaining);
    const fmt = (seconds: number) => `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    if (remaining <= 0) return `Elapsed ${fmt(elapsedSeconds)} · Avg ${fmt(avgSecsPerAction)} per action · 0 left`;
    return `Elapsed ${fmt(elapsedSeconds)} · Avg ${fmt(avgSecsPerAction)} per action · ~${fmt(estSecsLeft)} left`;
  }, [actionsThisSession, elapsedSeconds, remaining]);

  return { message, actionsThisSession, elapsedSeconds };
};
