import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Target } from "lucide-react";

interface FocusTimerWidgetProps {
  onNavigate?: () => void;
}

type TimerMode = 'work' | 'break' | 'longBreak';

const TIMER_DURATIONS: Record<TimerMode, number> = {
  work: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60
};

export const FocusTimerWidget = ({ onNavigate }: FocusTimerWidgetProps) => {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer complete
      if (mode === 'work') {
        setSessions(prev => prev + 1);
        const newSessions = sessions + 1;
        if (newSessions % 4 === 0) {
          setMode('longBreak');
          setTimeLeft(TIMER_DURATIONS.longBreak);
        } else {
          setMode('break');
          setTimeLeft(TIMER_DURATIONS.break);
        }
      } else {
        setMode('work');
        setTimeLeft(TIMER_DURATIONS.work);
      }
      setIsRunning(false);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, sessions]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-3">
      {/* Mode buttons */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={mode === 'work' ? 'default' : 'outline'}
          onClick={() => switchMode('work')}
          className="h-6 text-[10px] px-2"
        >
          <Target className="h-3 w-3 mr-1" />
          Focus
        </Button>
        <Button
          size="sm"
          variant={mode === 'break' ? 'default' : 'outline'}
          onClick={() => switchMode('break')}
          className="h-6 text-[10px] px-2"
        >
          <Coffee className="h-3 w-3 mr-1" />
          Break
        </Button>
      </div>

      {/* Timer display */}
      <div className="relative">
        <svg className="w-24 h-24 -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="44"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            className="text-muted/30"
          />
          <circle
            cx="48"
            cy="48"
            r="44"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            className={mode === 'work' ? 'text-primary' : 'text-emerald-500'}
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button size="sm" onClick={toggleTimer} className="h-7 w-7 p-0">
          {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="outline" onClick={resetTimer} className="h-7 w-7 p-0">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Sessions count */}
      <div className="text-[10px] text-muted-foreground">
        {sessions} sessions completed today
      </div>
    </div>
  );
};
