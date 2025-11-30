import { useEffect, useState } from "react";
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

export const HomeBackground = () => {
  const [formData, setFormData] = useState<FormData[]>([]);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch form data
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

      // Fetch positive action scores
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
        .limit(12);

      if (actionData) {
        setActions(actionData as unknown as ActionData[]);
      }

      // Fetch current program session
      const { data: programData } = await supabase
        .from("player_programs")
        .select("sessions")
        .eq("player_id", TYRESE_ID)
        .eq("is_current", true)
        .single();

      if (programData?.sessions) {
        const sessions = programData.sessions as Record<string, { exercises?: SessionExercise[] }>;
        const allExercises: SessionExercise[] = [];
        Object.values(sessions).forEach(session => {
          if (session?.exercises) {
            allExercises.push(...session.exercises.slice(0, 2));
          }
        });
        setSessionExercises(allExercises.slice(0, 8));
      }
    };

    fetchData();
  }, []);

  const getR90Color = (score: number) => {
    if (score < 0.6) return "hsl(0, 84%, 60%)";
    if (score < 0.8) return "hsl(25, 95%, 53%)";
    if (score < 1.0) return "hsl(48, 96%, 53%)";
    if (score < 1.4) return "hsl(82, 84%, 67%)";
    return "hsl(142, 76%, 36%)";
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle gradient overlay - behind data */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/60 z-0" />
      
      {/* Form Chart - Top Left */}
      <div className="absolute top-20 left-8 opacity-[0.25] transform -rotate-6 z-[1]">
        <div className="font-bebas text-xs uppercase tracking-widest text-primary mb-2">R90 Form</div>
        <div className="flex items-end gap-3 h-32">
          {formData.reverse().map((match, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div 
                className="w-8 rounded-t"
                style={{ 
                  height: `${Math.max(match.r90_score * 60, 10)}px`,
                  backgroundColor: getR90Color(match.r90_score)
                }}
              />
              <span className="text-[8px] text-foreground/60 font-mono">{match.r90_score.toFixed(2)}</span>
              <span className="text-[7px] text-muted-foreground max-w-[40px] truncate">{match.opponent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Chart - Top Right */}
      <div className="absolute top-32 right-12 opacity-[0.20] transform rotate-3 z-[1]">
        <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3">Performance Trend</div>
        <div className="flex items-end gap-4 h-40">
          {formData.map((match, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div 
                className="w-10 rounded-t transition-all"
                style={{ 
                  height: `${Math.max(match.r90_score * 70, 15)}px`,
                  backgroundColor: getR90Color(match.r90_score)
                }}
              />
              <span className="text-[10px] text-foreground/60 font-mono font-bold">{match.r90_score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Scores - Scattered across middle */}
      {actions.map((action, i) => (
        <div
          key={i}
          className="absolute opacity-[0.20] transform z-[1]"
          style={{
            top: `${20 + (i * 7) % 60}%`,
            left: i % 2 === 0 ? `${5 + (i * 8) % 30}%` : `${60 + (i * 5) % 30}%`,
            transform: `rotate(${(i - 6) * 3}deg)`,
          }}
        >
          <div className="bg-card/50 border border-primary/20 rounded p-3 max-w-[220px]">
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="text-lg font-bold font-mono"
                style={{ color: action.action_score > 0.15 ? "hsl(142, 76%, 36%)" : "hsl(82, 84%, 67%)" }}
              >
                +{action.action_score.toFixed(2)}
              </span>
              <span className="text-[8px] text-muted-foreground">{action.minute}'</span>
            </div>
            <div className="text-[9px] text-foreground/70 font-medium uppercase tracking-wide">
              {action.action_type}
            </div>
            <div className="text-[8px] text-muted-foreground line-clamp-2 mt-1">
              {action.action_description}
            </div>
          </div>
        </div>
      ))}

      {/* Program Session - Bottom Left */}
      <div className="absolute bottom-32 left-6 opacity-[0.20] transform rotate-2 z-[1]">
        <div className="font-bebas text-xs uppercase tracking-widest text-primary mb-2">Training Program</div>
        <div className="space-y-2 max-w-[200px]">
          {sessionExercises.slice(0, 4).map((exercise, i) => (
            <div key={i} className="bg-card/30 border border-border/30 rounded p-2">
              <div className="text-[9px] font-medium text-foreground/80 truncate">{exercise.name}</div>
              <div className="text-[8px] text-muted-foreground">
                {exercise.sets} × {exercise.repetitions} {exercise.load && `@ ${exercise.load}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Program Session - Bottom Right */}
      <div className="absolute bottom-20 right-8 opacity-[0.18] transform -rotate-3 z-[1]">
        <div className="font-bebas text-sm uppercase tracking-widest text-primary mb-3">Session C</div>
        <div className="grid grid-cols-2 gap-2 max-w-[280px]">
          {sessionExercises.slice(4, 8).map((exercise, i) => (
            <div key={i} className="bg-card/30 border border-border/30 rounded p-2">
              <div className="text-[8px] font-medium text-foreground/80 truncate">{exercise.name}</div>
              <div className="text-[7px] text-muted-foreground">
                {exercise.sets}×{exercise.repetitions}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating R90 scores */}
      <div className="absolute top-1/2 left-1/4 opacity-[0.15] transform -translate-y-1/2 z-[1]">
        <span className="text-8xl font-bebas text-primary">1.74</span>
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-[0.12] transform z-[1]">
        <span className="text-6xl font-bebas text-foreground">R90</span>
      </div>

      {/* Additional scattered metrics */}
      <div className="absolute top-[60%] left-[15%] opacity-[0.15] z-[1]">
        <div className="font-mono text-2xl text-green-500">+0.28</div>
        <div className="text-[8px] text-muted-foreground uppercase">Shot xG</div>
      </div>
      <div className="absolute top-[45%] right-[20%] opacity-[0.15] z-[1]">
        <div className="font-mono text-xl text-lime-400">+0.22</div>
        <div className="text-[8px] text-muted-foreground uppercase">Triple Threat</div>
      </div>
    </div>
  );
};
