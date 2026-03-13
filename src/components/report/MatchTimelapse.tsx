import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/portalTranslations";
import { parseMinuteToSeconds } from "@/lib/actionSorting";

interface TimelapseAction {
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  zone?: number | null;
  zone_details?: { zone: number; sub?: number }[] | null;
}

interface MatchTimelapseProps {
  actions: TimelapseAction[];
  language?: string;
}

const WIDTH = 300;
const HEIGHT = 450;
const ZONE_W = (WIDTH - 20) / 3;
const ZONE_H = (HEIGHT - 20) / 6;
const SUB_W = ZONE_W / 3;
const SUB_H = ZONE_H / 3;

const ZONE_GRID = [
  [16, 17, 18],
  [13, 14, 15],
  [10, 11, 12],
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const getZoneRect = (zone: number, sub?: number): { x: number; y: number; w: number; h: number } => {
  const col = (zone - 1) % 3;
  const row = Math.floor((zone - 1) / 3);
  const zoneX = 10 + col * ZONE_W;
  const zoneY = HEIGHT - 10 - (row + 1) * ZONE_H;

  if (!sub || sub < 1 || sub > 9) {
    return { x: zoneX, y: zoneY, w: ZONE_W, h: ZONE_H };
  }

  const subCol = (sub - 1) % 3;
  const subRow = Math.floor((sub - 1) / 3);
  return {
    x: zoneX + subCol * SUB_W,
    y: zoneY + (2 - subRow) * SUB_H,
    w: SUB_W,
    h: SUB_H,
  };
};

const getScoreColor = (score: number): string => {
  if (score >= 0.05) return "rgba(34, 197, 94, 0.8)";
  if (score >= 0.01) return "rgba(132, 204, 22, 0.7)";
  if (score > -0.01) return "rgba(250, 204, 21, 0.6)";
  if (score > -0.04) return "rgba(249, 115, 22, 0.7)";
  return "rgba(239, 68, 68, 0.8)";
};

type ActionCategory = "offensive" | "defensive" | "other";

const categoriseAction = (type: string | null | undefined): ActionCategory => {
  const lower = (type ?? "").toLowerCase();
  if (["goal", "assist", "key pass", "chance created", "shot on target", "dribble", "carry", "pass", "cross", "through ball", "attacking", "build-up", "shot", "set-piece", "corner", "free-kick", "penalty", "throw-in", "goal-kick"].some(k => lower.includes(k))) return "offensive";
  if (["tackle", "interception", "block", "clearance", "defensive", "pressing", "recovery", "aerial", "header", "regain"].some(k => lower.includes(k))) return "defensive";
  return "other";
};

/** Order zone_details for multi-zone actions based on category direction */
const orderZonePoints = (
  points: { zone: number; sub?: number }[],
  category: ActionCategory
): { zone: number; sub?: number }[] => {
  if (points.length <= 1) return points;

  const sorted = [...points].sort((a, b) => {
    // Primary sort by zone (pitch row), secondary by sub
    const diff = a.zone - b.zone;
    if (diff !== 0) return diff;
    return (a.sub ?? 5) - (b.sub ?? 5);
  });

  // Offensive = forward (low zone → high zone), defensive = backward (high → low)
  if (category === "defensive") {
    sorted.reverse();
  }

  return sorted;
};

// 120 zones per minute = 2 zones per second = 500ms per zone
const MS_PER_ZONE = 500;

interface ZoneStep {
  zone: number;
  sub?: number;
  score: number;
  actionNumber: number;
  minute: number;
  actionType: string;
}

export const MatchTimelapse = ({ actions, language = "en" }: MatchTimelapseProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [trail, setTrail] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build the step sequence from sorted actions
  const steps: ZoneStep[] = useMemo(() => {
    const sorted = [...actions].sort((a, b) => parseMinuteToSeconds(a.minute) - parseMinuteToSeconds(b.minute));
    const result: ZoneStep[] = [];

    for (const action of sorted) {
      const category = categoriseAction(action.action_type);

      if (action.zone_details && Array.isArray(action.zone_details) && action.zone_details.length > 0) {
        const ordered = orderZonePoints(
          action.zone_details.filter(zp => zp.zone >= 1 && zp.zone <= 18),
          category
        );
        for (const zp of ordered) {
          result.push({
            zone: zp.zone,
            sub: zp.sub,
            score: action.action_score,
            actionNumber: action.action_number,
            minute: action.minute,
            actionType: action.action_type,
          });
        }
      } else if (action.zone != null && action.zone >= 1 && action.zone <= 18) {
        result.push({
          zone: action.zone,
          score: action.action_score,
          actionNumber: action.action_number,
          minute: action.minute,
          actionType: action.action_type,
        });
      }
    }

    return result;
  }, [actions]);

  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (steps.length === 0) return;
    setIsPlaying(true);

    const startFrom = currentStep >= steps.length - 1 ? -1 : currentStep;
    let step = startFrom;

    timerRef.current = setInterval(() => {
      step++;
      if (step >= steps.length) {
        stopPlayback();
        return;
      }
      setCurrentStep(step);
      setTrail(prev => [...prev, step]);
    }, MS_PER_ZONE);
  }, [steps, currentStep, stopPlayback]);

  const reset = useCallback(() => {
    stopPlayback();
    setCurrentStep(-1);
    setTrail([]);
  }, [stopPlayback]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (steps.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t(language, "no_zone_data")}</div>;
  }

  const current = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const progress = steps.length > 0 ? Math.max(0, (currentStep + 1) / steps.length) : 0;

  // Build trail opacity map: more recent = brighter
  const trailMap = new Map<string, { score: number; opacity: number }>();
  const trailWindow = 8;
  const visibleTrail = trail.slice(-trailWindow);
  visibleTrail.forEach((stepIdx, i) => {
    const s = steps[stepIdx];
    if (!s) return;
    const key = `${s.zone}.${s.sub ?? 0}`;
    const opacity = 0.15 + (i / trailWindow) * 0.6;
    trailMap.set(key, { score: s.score, opacity });
  });

  const formatTime = (minute: number): string => {
    const minPart = Math.floor(minute);
    const secPart = Math.round((minute - minPart) * 100);
    return `${minPart}:${secPart.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t(language, "match_timelapse")}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={reset}
            disabled={currentStep < 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Current action info */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground min-h-[16px]">
        <span>{current ? `${formatTime(current.minute)}' - ${current.actionType}` : t(language, "press_play")}</span>
        <span>{currentStep + 1} / {steps.length}</span>
      </div>

      {/* Pitch */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[280px] md:max-w-[320px]"
          style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        >
          {/* Pitch background */}
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="6" fill="#1a472a" />

          {/* Pitch markings */}
          <rect x="10" y="10" width={WIDTH - 20} height={HEIGHT - 20} rx="2" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="10" y1={HEIGHT / 2} x2={WIDTH - 10} y2={HEIGHT / 2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="2" fill="rgba(255,255,255,0.2)" />

          {/* Penalty boxes */}
          <rect x="60" y="10" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="100" y="10" width="100" height="25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="60" y={HEIGHT - 65} width="180" height="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="100" y={HEIGHT - 35} width="100" height="25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

          {/* 18-zone grid lines (subtle) */}
          {[1, 2].map(i => (
            <line key={`vl-${i}`} x1={10 + i * ZONE_W} y1="10" x2={10 + i * ZONE_W} y2={HEIGHT - 10} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          ))}
          {[1, 2, 3, 4, 5].map(i => (
            <line key={`hl-${i}`} x1="10" y1={10 + i * ZONE_H} x2={WIDTH - 10} y2={10 + i * ZONE_H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          ))}

          {/* Trail cells */}
          {Array.from(trailMap.entries()).map(([key, { score, opacity }]) => {
            const [z, s] = key.split(".").map(Number);
            const rect = getZoneRect(z, s || undefined);
            return (
              <rect
                key={`trail-${key}`}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx="1"
                fill={getScoreColor(score)}
                opacity={opacity}
              />
            );
          })}

          {/* Current active cell */}
          {current && (() => {
            const rect = getZoneRect(current.zone, current.sub);
            return (
              <>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx="2"
                  fill={getScoreColor(current.score)}
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.95"
                >
                  <animate attributeName="opacity" values="0.95;0.7;0.95" dur="0.8s" repeatCount="indefinite" />
                </rect>
                {/* Action number label */}
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2 + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {current.actionNumber}
                </text>
              </>
            );
          })()}

          {/* Direction labels */}
          <text x={WIDTH / 2} y={HEIGHT - 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            {t(language, "own_goal")}
          </text>
          <text x={WIDTH / 2} y="7" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            ↑ {t(language, "attacking_direction")}
          </text>
        </svg>
      </div>
    </div>
  );
};
