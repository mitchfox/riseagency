import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  opponent: string;
  r90_score: number;
  result: string;
  analysis_date: string;
}

interface ActionData {
  action_type: string;
  action_description: string;
  action_score: number;
  minute: number;
}

interface SessionExercise {
  name: string;
  sets: number;
  repetitions: string;
  load: string;
}

const TYRESE_ID = "b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e";

// SAVED FOR LATER USE - R90 Form, Actions, and Programming data overlay
export const PlayerDataOverlay = ({ xrayOpacity = 0, maskStyle = {} }: { xrayOpacity?: number; maskStyle?: React.CSSProperties }) => {
  const [formData, setFormData] = useState<FormData[]>([]);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [sessionName, setSessionName] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Top speed state
  const [displaySpeed, setDisplaySpeed] = useState(28.5);
  const targetSpeedRef = useRef(28.5);
  const baseSpeed = 28.5;
  const maxSpeed = 35.2;

  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchData = async () => {
        try {
          const { data: analysisData } = await supabase
            .from("player_analysis")
            .select("opponent, r90_score, result, analysis_date")
            .eq("player_id", TYRESE_ID)
            .not("r90_score", "is", null)
            .order("analysis_date", { ascending: false })
            .limit(5);

          if (analysisData) {
            setFormData(analysisData as FormData[]);
          }

          const { data: actionData } = await supabase
            .from("performance_report_actions")
            .select(`
              action_type,
              action_description,
              action_score,
              minute,
              player_analysis!inner(player_id)
            `)
            .eq("player_analysis.player_id", TYRESE_ID)
            .gt("action_score", 0)
            .order("action_score", { ascending: false })
            .limit(8);

          if (actionData) {
            setActions(actionData as unknown as ActionData[]);
          }

          const { data: programData } = await supabase
            .from("player_programs")
            .select("sessions")
            .eq("player_id", TYRESE_ID)
            .eq("is_current", true)
            .single();

          if (programData?.sessions) {
            const sessions = programData.sessions as Record<string, { exercises?: SessionExercise[] }>;
            for (const [name, session] of Object.entries(sessions)) {
              if (session?.exercises && session.exercises.length > 0) {
                setSessionExercises(session.exercises.slice(0, 6));
                setSessionName(`Session ${name}`);
                break;
              }
            }
          }
          
          setIsLoaded(true);
        } catch (error) {
          console.error('Error fetching background data:', error);
          setIsLoaded(true);
        }
      };

      fetchData();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (xrayOpacity > 0) {
      targetSpeedRef.current = baseSpeed + (maxSpeed - baseSpeed) * xrayOpacity;
    } else {
      targetSpeedRef.current = baseSpeed;
    }
  }, [xrayOpacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplaySpeed(prev => {
        const diff = targetSpeedRef.current - prev;
        if (Math.abs(diff) < 0.05) return targetSpeedRef.current;
        return prev + diff * 0.08;
      });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  const getR90Color = (score: number) => {
    if (score < 0.6) return "hsl(0, 84%, 60%)";
    if (score < 0.8) return "hsl(25, 95%, 53%)";
    if (score < 1.0) return "hsl(48, 96%, 53%)";
    if (score < 1.4) return "hsl(82, 84%, 67%)";
    return "hsl(142, 76%, 36%)";
  };

  const getSpeedColor = (speed: number) => {
    const ratio = (speed - baseSpeed) / (maxSpeed - baseSpeed);
    if (ratio < 0.3) return "hsl(48, 96%, 53%)";
    if (ratio < 0.6) return "hsl(35, 100%, 50%)";
    if (ratio < 0.8) return "hsl(25, 95%, 53%)";
    return "hsl(0, 84%, 60%)";
  };

  const reversedFormData = [...formData].reverse();
  const speedProgress = ((displaySpeed - baseSpeed) / (maxSpeed - baseSpeed)) * 100;

  if (!isLoaded || xrayOpacity === 0) return null;

  return (
    <div 
      className="absolute inset-0 transition-opacity duration-150"
      style={{ 
        opacity: xrayOpacity,
        ...maskStyle
      }}
    >
      {/* LEFT COLUMN - R90 & Actions */}
      <div className="absolute left-4 md:left-8 top-24 bottom-32 w-[200px] md:w-[280px] flex flex-col gap-8 z-[1]">
        {/* R90 Form Chart */}
        <div>
          <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3 border-b border-primary/30 pb-1">
            R90 Form
          </div>
          <div className="flex items-end gap-2 h-28">
            {reversedFormData.map((match, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div 
                  className="w-full max-w-[32px] rounded-t"
                  style={{ 
                    height: `${Math.max(match.r90_score * 55, 12)}px`,
                    backgroundColor: getR90Color(match.r90_score)
                  }}
                />
                <span className="text-[9px] text-foreground/70 font-mono font-bold">{match.r90_score.toFixed(2)}</span>
                <span className="text-[7px] text-muted-foreground truncate max-w-[40px]">{match.opponent?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Highlights */}
        <div>
          <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3 border-b border-primary/30 pb-1">
            Positive Actions
          </div>
          <div className="space-y-2">
            {actions.slice(0, 4).map((action, i) => (
              <div key={i} className="flex items-center gap-2 bg-card/40 border border-primary/20 rounded px-2 py-1.5">
                <span 
                  className="text-base font-bold font-mono"
                  style={{ color: action.action_score > 0.15 ? "hsl(142, 76%, 36%)" : "hsl(82, 84%, 67%)" }}
                >
                  +{action.action_score.toFixed(2)}
                </span>
                <span className="text-[8px] text-foreground/60 uppercase tracking-wide truncate flex-1">
                  {action.action_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Programming & Stats */}
      <div className="absolute right-4 md:right-8 top-24 bottom-32 w-[200px] md:w-[280px] flex flex-col gap-6 z-[1]">
        {/* TOP SPEED - Dynamic */}
        <div>
          <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3 border-b border-primary/30 pb-1">
            Top Speed
          </div>
          <div className="bg-card/40 border border-primary/30 rounded-lg p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span 
                className="text-4xl md:text-5xl font-bebas tabular-nums transition-colors duration-200"
                style={{ color: getSpeedColor(displaySpeed) }}
              >
                {displaySpeed.toFixed(1)}
              </span>
              <span className="text-lg font-bebas text-foreground/60">km/h</span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-100"
                style={{ 
                  width: `${Math.min(speedProgress, 100)}%`,
                  backgroundColor: getSpeedColor(displaySpeed),
                  boxShadow: `0 0 10px ${getSpeedColor(displaySpeed)}`
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted-foreground">{baseSpeed} km/h</span>
              <span className="text-[8px] text-muted-foreground">{maxSpeed} km/h</span>
            </div>
            {xrayOpacity > 0.5 && (
              <div className="mt-2 text-[10px] text-primary/80 font-mono animate-pulse">
                LIVE TRACKING • {Math.floor(Date.now() / 1000 % 90)}'
              </div>
            )}
          </div>
        </div>

        {/* Gym Program */}
        {sessionExercises.length > 0 && (
          <div>
            <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3 border-b border-primary/30 pb-1">
              {sessionName || "Training Program"}
            </div>
            <div className="space-y-2">
              {sessionExercises.slice(0, 4).map((exercise, i) => (
                <div key={i} className="bg-card/40 border border-border/40 rounded px-2 py-1.5">
                  <div className="text-[9px] font-medium text-foreground/80 truncate">{exercise.name}</div>
                  <div className="text-[8px] text-muted-foreground flex gap-2">
                    <span>{exercise.sets} × {exercise.repetitions}</span>
                    {exercise.load && <span className="text-primary/80">{exercise.load}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Actions */}
        <div>
          <div className="font-bebas text-xs uppercase tracking-widest text-primary/80 mb-2">
            More Highlights
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {actions.slice(4, 8).map((action, i) => (
              <div key={i} className="bg-card/30 border border-primary/10 rounded px-2 py-1 text-center">
                <span 
                  className="text-sm font-bold font-mono"
                  style={{ color: action.action_score > 0.15 ? "hsl(142, 76%, 36%)" : "hsl(82, 84%, 67%)" }}
                >
                  +{action.action_score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM - Stats bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6 md:gap-12 z-[1]">
        {reversedFormData.slice(0, 3).map((match, i) => (
          <div key={i} className="text-center">
            <div 
              className="text-2xl md:text-3xl font-bebas"
              style={{ color: getR90Color(match.r90_score) }}
            >
              {match.r90_score.toFixed(2)}
            </div>
            <div className="text-[8px] text-muted-foreground uppercase tracking-wider">
              vs {match.opponent?.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
