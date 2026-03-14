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

const getZoneRect = (zone: number, sub?: number): { x: number; y: number; w: number; h: number } => {
  const col = (zone - 1) % 3;
  const row = Math.floor((zone - 1) / 3);
  const zoneX = 10 + col * ZONE_W;
  const zoneY = HEIGHT - 10 - (row + 1) * ZONE_H;
  if (!sub || sub < 1 || sub > 9) return { x: zoneX, y: zoneY, w: ZONE_W, h: ZONE_H };
  const subCol = (sub - 1) % 3;
  const subRow = Math.floor((sub - 1) / 3);
  return { x: zoneX + subCol * SUB_W, y: zoneY + (2 - subRow) * SUB_H, w: SUB_W, h: SUB_H };
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

const orderZonePoints = (
  points: { zone: number; sub?: number }[],
  category: ActionCategory
): { zone: number; sub?: number }[] => {
  if (points.length <= 1) return points;
  const sorted = [...points].sort((a, b) => {
    const diff = a.zone - b.zone;
    if (diff !== 0) return diff;
    return (a.sub ?? 5) - (b.sub ?? 5);
  });
  if (category === "defensive") sorted.reverse();
  return sorted;
};

// --- Timing constants ---
const MS_PER_ZONE = 1000; // 1s per zone step (clock advances 1 game-second)
const GAP_SPEED_NORMAL = 60; // 60 game-seconds per real-second for small gaps
const GAP_SPEED_FAST = 300; // 300 game-seconds per real-second for large gaps (halftime etc)
const LARGE_GAP_THRESHOLD = 300; // 5+ min gap = fast skip

const getGapSpeed = (gapSeconds: number): number => {
  return gapSeconds >= LARGE_GAP_THRESHOLD ? GAP_SPEED_FAST : GAP_SPEED_NORMAL;
};

interface ZoneStep {
  zone: number;
  sub?: number;
  score: number;
  actionNumber: number;
  minute: number;
  actionType: string;
  gameSeconds: number;
}

interface Segment {
  type: "gap" | "zone";
  startGameTime: number;
  endGameTime: number;
  realDuration: number;
  stepIndex?: number;
}

const formatClock = (gameSeconds: number): string => {
  const mins = Math.floor(Math.max(0, gameSeconds) / 60);
  const secs = Math.floor(Math.max(0, gameSeconds) % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const MatchTimelapse = ({ actions, language = "en" }: MatchTimelapseProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [trail, setTrail] = useState<number[]>([]);
  const [gameTime, setGameTime] = useState(-1);

  const animRef = useRef<number | null>(null);
  const startRealTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const activatedStepsRef = useRef<number[]>([]);

  // Build zone steps with game-seconds
  const steps: ZoneStep[] = useMemo(() => {
    const sorted = [...actions].sort((a, b) => parseMinuteToSeconds(a.minute) - parseMinuteToSeconds(b.minute));
    const result: ZoneStep[] = [];
    for (const action of sorted) {
      const category = categoriseAction(action.action_type);
      const gs = parseMinuteToSeconds(action.minute);
      if (action.zone_details && Array.isArray(action.zone_details) && action.zone_details.length > 0) {
        const ordered = orderZonePoints(
          action.zone_details.filter(zp => zp.zone >= 1 && zp.zone <= 18),
          category
        );
        for (const zp of ordered) {
          result.push({ zone: zp.zone, sub: zp.sub, score: action.action_score, actionNumber: action.action_number, minute: action.minute, actionType: action.action_type, gameSeconds: gs });
        }
      } else if (action.zone != null && action.zone >= 1 && action.zone <= 18) {
        result.push({ zone: action.zone, score: action.action_score, actionNumber: action.action_number, minute: action.minute, actionType: action.action_type, gameSeconds: gs });
      }
    }
    return result;
  }, [actions]);

  // Build timeline segments
  const { segments, totalRealDuration, firstGameTime, lastGameTime } = useMemo(() => {
    if (steps.length === 0) return { segments: [] as Segment[], totalRealDuration: 0, firstGameTime: 0, lastGameTime: 0 };

    const segs: Segment[] = [];
    const first = steps[0].gameSeconds;
    const last = steps[steps.length - 1].gameSeconds;
    let cursor = first;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Use the effective game time: if step.gameSeconds <= cursor, offset by 1s so clock keeps ticking
      const effectiveStart = Math.max(step.gameSeconds, cursor + 0.5) > cursor + 0.5
        ? step.gameSeconds
        : cursor;

      if (effectiveStart > cursor + 0.5) {
        const gapSecs = effectiveStart - cursor;
        const speed = getGapSpeed(gapSecs);
        segs.push({
          type: "gap",
          startGameTime: cursor,
          endGameTime: effectiveStart,
          realDuration: (gapSecs / speed) * 1000,
        });
      }
      // Zone step: clock advances 1 game-second over 1 real second
      segs.push({
        type: "zone",
        startGameTime: effectiveStart,
        endGameTime: effectiveStart + 1,
        realDuration: MS_PER_ZONE,
        stepIndex: i,
      });
      cursor = effectiveStart + 1;
    }

    const total = segs.reduce((sum, s) => sum + s.realDuration, 0);
    return { segments: segs, totalRealDuration: total, firstGameTime: first, lastGameTime: last + Math.max(0, cursor - last - 1) };
  }, [steps]);

  // Unique action markers for the timeline
  const actionMarkers = useMemo(() => {
    if (steps.length === 0 || lastGameTime === firstGameTime) return [];
    const seen = new Set<number>();
    const markers: { gameSeconds: number; score: number; actionNumber: number }[] = [];
    for (const s of steps) {
      if (!seen.has(s.actionNumber)) {
        seen.add(s.actionNumber);
        markers.push({ gameSeconds: s.gameSeconds, score: s.score, actionNumber: s.actionNumber });
      }
    }
    return markers;
  }, [steps, firstGameTime, lastGameTime]);

  const stopPlayback = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const animate = useCallback((timestamp: number) => {
    const elapsed = timestamp - startRealTimeRef.current + pausedElapsedRef.current;

    let cumulative = 0;
    let foundSeg: Segment | null = null;
    let segOffset = 0;

    for (const seg of segments) {
      if (elapsed < cumulative + seg.realDuration) {
        foundSeg = seg;
        segOffset = elapsed - cumulative;
        break;
      }
      if (seg.type === "zone" && seg.stepIndex != null) {
        if (!activatedStepsRef.current.includes(seg.stepIndex)) {
          activatedStepsRef.current = [...activatedStepsRef.current, seg.stepIndex];
        }
      }
      cumulative += seg.realDuration;
    }

    if (!foundSeg) {
      setGameTime(lastGameTime);
      if (steps.length > 0) {
        const lastIdx = steps.length - 1;
        setCurrentStep(lastIdx);
        if (!activatedStepsRef.current.includes(lastIdx)) {
          activatedStepsRef.current = [...activatedStepsRef.current, lastIdx];
        }
        setTrail([...activatedStepsRef.current]);
      }
      setIsPlaying(false);
      return;
    }

    if (foundSeg.type === "gap") {
      const progress = segOffset / foundSeg.realDuration;
      const gt = foundSeg.startGameTime + (foundSeg.endGameTime - foundSeg.startGameTime) * progress;
      setGameTime(gt);
    } else {
      const progress = segOffset / foundSeg.realDuration;
      const gt = foundSeg.startGameTime + (foundSeg.endGameTime - foundSeg.startGameTime) * progress;
      setGameTime(gt);
      const idx = foundSeg.stepIndex!;
      setCurrentStep(idx);
      if (!activatedStepsRef.current.includes(idx)) {
        activatedStepsRef.current = [...activatedStepsRef.current, idx];
        setTrail([...activatedStepsRef.current]);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }, [segments, lastGameTime, steps]);

  const startPlayback = useCallback(() => {
    if (steps.length === 0 || segments.length === 0) return;
    setIsPlaying(true);

    if (pausedElapsedRef.current >= totalRealDuration) {
      pausedElapsedRef.current = 0;
      activatedStepsRef.current = [];
      setCurrentStep(-1);
      setTrail([]);
      setGameTime(firstGameTime);
    }

    startRealTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(animate);
  }, [steps, segments, totalRealDuration, firstGameTime, animate]);

  const pause = useCallback(() => {
    if (animRef.current) {
      pausedElapsedRef.current += performance.now() - startRealTimeRef.current;
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    stopPlayback();
    pausedElapsedRef.current = 0;
    activatedStepsRef.current = [];
    setCurrentStep(-1);
    setTrail([]);
    setGameTime(-1);
  }, [stopPlayback]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) pause();
    else startPlayback();
  }, [isPlaying, pause, startPlayback]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (steps.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t(language, "no_zone_data")}</div>;
  }

  const current = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const timeSpan = lastGameTime - firstGameTime;
  const clockProgress = gameTime >= 0 && timeSpan > 0 ? Math.min(1, Math.max(0, (gameTime - firstGameTime) / timeSpan)) : 0;

  // Trail map
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t(language, "match_timelapse")}</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} disabled={currentStep < 0 && gameTime < 0}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlayback}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main layout: pitch + time board */}
      <div className="flex gap-3 items-stretch justify-center">
        {/* Pitch */}
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[260px] md:max-w-[300px]"
          style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        >
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="6" fill="#1a472a" />
          <rect x="10" y="10" width={WIDTH - 20} height={HEIGHT - 20} rx="2" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="10" y1={HEIGHT / 2} x2={WIDTH - 10} y2={HEIGHT / 2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="2" fill="rgba(255,255,255,0.2)" />
          <rect x="60" y="10" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="100" y="10" width="100" height="25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="60" y={HEIGHT - 65} width="180" height="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="100" y={HEIGHT - 35} width="100" height="25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

          {[1, 2].map(i => (
            <line key={`vl-${i}`} x1={10 + i * ZONE_W} y1="10" x2={10 + i * ZONE_W} y2={HEIGHT - 10} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          ))}
          {[1, 2, 3, 4, 5].map(i => (
            <line key={`hl-${i}`} x1="10" y1={10 + i * ZONE_H} x2={WIDTH - 10} y2={10 + i * ZONE_H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          ))}

          {/* Trail */}
          {Array.from(trailMap.entries()).map(([key, { score, opacity }]) => {
            const [z, s] = key.split(".").map(Number);
            const rect = getZoneRect(z, s || undefined);
            return (
              <rect key={`trail-${key}`} x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="1" fill={getScoreColor(score)} opacity={opacity} />
            );
          })}

          {/* Active cell */}
          {current && (() => {
            const rect = getZoneRect(current.zone, current.sub);
            return (
              <>
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="2" fill={getScoreColor(current.score)} stroke="white" strokeWidth="2" opacity="0.95">
                  <animate attributeName="opacity" values="0.95;0.7;0.95" dur="0.8s" repeatCount="indefinite" />
                </rect>
                <text x={rect.x + rect.w / 2} y={rect.y + rect.h / 2 + 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                  {current.actionNumber}
                </text>
              </>
            );
          })()}

          <text x={WIDTH / 2} y={HEIGHT - 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            {t(language, "own_goal")}
          </text>
          <text x={WIDTH / 2} y="7" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            ↑ {t(language, "attacking_direction")}
          </text>
        </svg>

        {/* Time Board */}
        <div className="flex flex-col items-center gap-2 min-w-[56px] select-none">
          {/* Scoreboard clock */}
          <div className="rounded-sm bg-black border border-[#333] px-2.5 py-1.5 text-center w-full shadow-[0_0_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div
              className="font-mono text-base font-black tracking-widest tabular-nums leading-tight"
              style={{ color: "#e8ff5a", textShadow: "0 0 8px rgba(232,255,90,0.4)" }}
            >
              {gameTime >= 0 ? formatClock(gameTime) : "--:--"}
            </div>
          </div>

          {/* Vertical timeline */}
          <div className="relative flex-1 w-6 min-h-[280px]">
            {/* Track line - right side */}
            <div className="absolute right-1 top-0 bottom-0 w-px bg-border" />

            {/* Action markers - right side */}
            {actionMarkers.map((m) => {
              const pct = timeSpan > 0 ? ((m.gameSeconds - firstGameTime) / timeSpan) * 100 : 0;
              return (
                <div
                  key={m.actionNumber}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    top: `${pct}%`,
                    right: 0,
                    backgroundColor: getScoreColor(m.score),
                    opacity: 0.6,
                    transform: "translateY(-50%)",
                  }}
                />
              );
            })}

            {/* Current position indicator */}
            {gameTime >= 0 && (
              <div
                className="absolute right-0 z-10 transition-[top] duration-75"
                style={{ top: `${clockProgress * 100}%` }}
              >
                <div className="w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: "#e8ff5a",
                    backgroundColor: "#e8ff5a",
                    boxShadow: "0 0 8px rgba(232,255,90,0.5)",
                    transform: "translate(50%, -50%)",
                  }}
                />
              </div>
            )}

            {/* Start / end time labels */}
            <span className="absolute left-0 top-0 -translate-y-full text-[8px] text-muted-foreground font-mono pb-0.5">
              {formatClock(firstGameTime)}
            </span>
            <span className="absolute left-0 bottom-0 translate-y-full text-[8px] text-muted-foreground font-mono pt-0.5">
              {formatClock(lastGameTime)}
            </span>
          </div>

          {/* Current action label */}
          <div className="text-center min-h-[28px]">
            {current ? (
              <>
                <div className="text-[9px] font-medium text-foreground leading-tight truncate max-w-[56px]">
                  {current.actionType}
                </div>
                <div className="text-[8px] text-muted-foreground">#{current.actionNumber}</div>
              </>
            ) : (
              <div className="text-[9px] text-muted-foreground">{t(language, "press_play")}</div>
            )}
          </div>
        </div>
      </div>

      {/* Step counter */}
      <div className="text-center text-[10px] text-muted-foreground">
        {currentStep >= 0 ? currentStep + 1 : 0} / {steps.length} {t(language, "zones")}
      </div>
    </div>
  );
};
