import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface ProductivityTimerOptions {
  totalActions: number;
  scoredCount: number;
}

type TimerMode = "avg_per_action" | "time_remaining" | "avg_per_10";

const TIMER_MODES: TimerMode[] = ["avg_per_action", "time_remaining", "avg_per_10"];

export const useProductivityTimer = ({ totalActions, scoredCount }: ProductivityTimerOptions) => {
  const [, setTick] = useState(0);
  const startTimeRef = useRef(Date.now());
  const startScoredRef = useRef(scoredCount);
  const [mode] = useState<TimerMode>(() => TIMER_MODES[Math.floor(Math.random() * TIMER_MODES.length)]);

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
    if (actionsThisSession < 1) return "⏱ Waiting for first score...";

    const avgSecsPerAction = elapsedSeconds / actionsThisSession;

    switch (mode) {
      case "avg_per_action": {
        const mins = Math.floor(avgSecsPerAction / 60);
        const secs = Math.floor(avgSecsPerAction % 60);
        return `⏱ Avg ${mins > 0 ? `${mins}m ` : ""}${secs}s per action`;
      }
      case "time_remaining": {
        const estSecsLeft = avgSecsPerAction * remaining;
        if (remaining <= 0) return "✅ All scored!";
        const minsLeft = Math.floor(estSecsLeft / 60);
        const secsLeft = Math.floor(estSecsLeft % 60);
        return `⏱ ~${minsLeft > 0 ? `${minsLeft}m ` : ""}${secsLeft}s to finish`;
      }
      case "avg_per_10": {
        const avgPer10 = avgSecsPerAction * 10;
        const mins = Math.floor(avgPer10 / 60);
        const secs = Math.floor(avgPer10 % 60);
        return `⏱ ${mins > 0 ? `${mins}m ` : ""}${secs}s per 10 actions`;
      }
    }
  }, [mode, actionsThisSession, elapsedSeconds, remaining]);

  return { message, actionsThisSession, elapsedSeconds };
};
