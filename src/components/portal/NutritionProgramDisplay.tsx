import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface NutritionProgram {
  id: string;
  phase_name: string;
  diet_framework: string | null;
  weekly_structure: string | null;
  key_additions: string | null;
  overview: string | null;
  is_current: boolean;
  calories: string | null;
  carbohydrates: string | null;
  protein: string | null;
  fat: string | null;
  micro_1_name: string | null;
  micro_1_amount: string | null;
  micro_2_name: string | null;
  micro_2_amount: string | null;
  supplement_1_name: string | null;
  supplement_1_amount: string | null;
  supplement_2_name: string | null;
  supplement_2_amount: string | null;
  supplement_3_name: string | null;
  supplement_3_amount: string | null;
  training_day_overview: string | null;
  training_day_timings: string | null;
  calories_training_day: string | null;
  carbs_training_day: string | null;
  protein_training_day: string | null;
  fat_training_day: string | null;
  match_day_overview: string | null;
  pre_match_timings: string | null;
  in_match_timings: string | null;
  post_match_timings: string | null;
  calories_match_day: string | null;
  carbs_match_day: string | null;
  protein_match_day: string | null;
  fat_match_day: string | null;
  recovery_day_overview: string | null;
  recovery_day_timings: string | null;
  calories_recovery_day: string | null;
  carbs_recovery_day: string | null;
  protein_recovery_day: string | null;
  fat_recovery_day: string | null;
}

interface NutritionProgramDisplayProps {
  playerId: string;
}

type DayType = "training" | "match" | "recovery";

const dayLabels: Record<DayType, { title: string; subtitle: string }> = {
  training: { title: "TRAINING", subtitle: "DAY" },
  match: { title: "MATCH", subtitle: "DAY" },
  recovery: { title: "RECOVERY", subtitle: "DAY" },
};

export const NutritionProgramDisplay = ({ playerId }: NutritionProgramDisplayProps) => {
  const [program, setProgram] = useState<NutritionProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayType>("training");

  useEffect(() => {
    fetchProgram();
  }, [playerId]);

  const fetchProgram = async () => {
    const { data, error } = await supabase
      .from("player_nutrition_programs")
      .select("*")
      .eq("player_id", playerId)
      .eq("is_current", true)
      .single();

    if (!error && data) {
      setProgram(data as NutritionProgram);
    }
    setLoading(false);
  };

  const handlePrevDay = () => {
    const days: DayType[] = ["training", "match", "recovery"];
    const currentIndex = days.indexOf(selectedDay);
    const prevIndex = currentIndex === 0 ? days.length - 1 : currentIndex - 1;
    setSelectedDay(days[prevIndex]);
  };

  const handleNextDay = () => {
    const days: DayType[] = ["training", "match", "recovery"];
    const currentIndex = days.indexOf(selectedDay);
    const nextIndex = currentIndex === days.length - 1 ? 0 : currentIndex + 1;
    setSelectedDay(days[nextIndex]);
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!program) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No nutrition program assigned yet.</p>
      </div>
    );
  }

  const getDayData = (day: DayType) => {
    switch (day) {
      case "training":
        return {
          timings: program.training_day_timings,
          overview: program.training_day_overview,
          calories: program.calories_training_day,
          carbs: program.carbs_training_day,
          protein: program.protein_training_day,
          fat: program.fat_training_day,
        };
      case "match":
        return {
          timings: [
            program.pre_match_timings && { label: "Pre-Match", text: program.pre_match_timings },
            program.in_match_timings && { label: "In-Match", text: program.in_match_timings },
            program.post_match_timings && { label: "Post-Match", text: program.post_match_timings },
          ].filter(Boolean),
          overview: program.match_day_overview,
          calories: program.calories_match_day,
          carbs: program.carbs_match_day,
          protein: program.protein_match_day,
          fat: program.fat_match_day,
        };
      case "recovery":
        return {
          timings: program.recovery_day_timings,
          overview: program.recovery_day_overview,
          calories: program.calories_recovery_day,
          carbs: program.carbs_recovery_day,
          protein: program.protein_recovery_day,
          fat: program.fat_recovery_day,
        };
    }
  };

  const dayData = getDayData(selectedDay);

  return (
    <div className="space-y-6">
      {/* Phase Overview Section */}
      <Card className="border-t-4 border-t-primary overflow-hidden bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted))]">
        <CardHeader className="pb-4">
          <CardTitle className="font-heading uppercase tracking-wider text-2xl">
            {program.phase_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {program.diet_framework && (
              <div className="bg-background/50 p-3 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground italic">Diet Framework</span>
                <p className="text-sm mt-1">{program.diet_framework}</p>
              </div>
            )}
            {program.weekly_structure && (
              <div className="bg-background/50 p-3 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground italic">Weekly Structure</span>
                <p className="text-sm mt-1">{program.weekly_structure}</p>
              </div>
            )}
            {program.key_additions && (
              <div className="bg-background/50 p-3 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground italic">Key Additions</span>
                <p className="text-sm mt-1">{program.key_additions}</p>
              </div>
            )}
          </div>

          {program.overview && (
            <div className="bg-background/50 p-4 rounded-lg border">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{program.overview}</p>
            </div>
          )}

          {/* Key Macros, Micros, Supplements Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Key Macros */}
            <div className="bg-[hsl(45,60%,25%)/0.8] p-4 rounded-lg">
              <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">KEY MACROS</h4>
              <div className="space-y-2 text-sm">
                {program.calories && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">Calories</span>
                    <span className="font-semibold text-foreground">{program.calories}</span>
                  </div>
                )}
                {program.carbohydrates && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">Carbohydrate</span>
                    <span className="font-semibold text-foreground">{program.carbohydrates}</span>
                  </div>
                )}
                {program.protein && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">Protein</span>
                    <span className="font-semibold text-foreground">{program.protein}</span>
                  </div>
                )}
                {program.fat && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">Fat</span>
                    <span className="font-semibold text-foreground">{program.fat}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Micros */}
            <div className="bg-[hsl(45,50%,30%)/0.6] p-4 rounded-lg">
              <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">KEY MICROS</h4>
              <div className="space-y-2 text-sm">
                {program.micro_1_name && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">{program.micro_1_name}</span>
                    <span className="font-semibold text-foreground">{program.micro_1_amount}</span>
                  </div>
                )}
                {program.micro_2_name && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">{program.micro_2_name}</span>
                    <span className="font-semibold text-foreground">{program.micro_2_amount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Supplements */}
            <div className="bg-[hsl(45,40%,35%)/0.5] p-4 rounded-lg">
              <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">SUPPLEMENTS</h4>
              <div className="space-y-2 text-sm">
                {program.supplement_1_name && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">{program.supplement_1_name}</span>
                    <span className="font-semibold text-foreground">{program.supplement_1_amount}</span>
                  </div>
                )}
                {program.supplement_2_name && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">{program.supplement_2_name}</span>
                    <span className="font-semibold text-foreground">{program.supplement_2_amount}</span>
                  </div>
                )}
                {program.supplement_3_name && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(43,60%,60%)]">{program.supplement_3_name}</span>
                    <span className="font-semibold text-foreground">{program.supplement_3_amount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Nutrition Card with Day Selector */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[hsl(120,30%,25%)] to-[hsl(120,25%,35%)] text-white py-3">
          <div className="flex items-center justify-center">
            <CardTitle className="font-heading uppercase tracking-[0.3em] text-xl">
              DAILY NUTRITION
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Left Arrow */}
            <Button
              variant="ghost"
              className="rounded-none h-auto px-2 md:px-4 bg-muted/30 hover:bg-muted/50"
              onClick={handlePrevDay}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Day Content */}
            <div className="flex-1 p-4 md:p-6 min-h-[300px]">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Side - Timings & Notes */}
                <div className="flex-1 space-y-4">
                  <div className="mb-4">
                    <h3 className="font-heading text-3xl md:text-4xl tracking-tight">
                      {dayLabels[selectedDay].title}
                    </h3>
                    <span className="font-heading text-2xl md:text-3xl text-primary italic">
                      {dayLabels[selectedDay].subtitle}
                    </span>
                  </div>

                  {/* Important Timings */}
                  {selectedDay === "match" && Array.isArray(dayData.timings) ? (
                    <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
                      <h4 className="font-semibold underline mb-3">IMPORTANT TIMINGS</h4>
                      <div className="space-y-2">
                        {(dayData.timings as any[]).map((timing: any, idx: number) => (
                          <div key={idx}>
                            <span className="italic text-sm text-muted-foreground">{timing.label}</span>
                            <p className="text-sm">{timing.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    dayData.timings && (
                      <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
                        <h4 className="font-semibold underline mb-3">IMPORTANT TIMINGS</h4>
                        <p className="text-sm whitespace-pre-wrap">{dayData.timings as string}</p>
                      </div>
                    )
                  )}

                  {/* Notes */}
                  {dayData.overview && (
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-semibold underline mb-3">NOTES</h4>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{dayData.overview}</p>
                    </div>
                  )}
                </div>

                {/* Right Side - Day Macros */}
                <div className="w-full md:w-64 space-y-4">
                  <div className="bg-[hsl(45,60%,25%)/0.8] p-4 rounded-lg">
                    <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">DAILY MACROS</h4>
                    <div className="space-y-2 text-sm">
                      {dayData.calories && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">Calories</span>
                          <span className="font-semibold text-foreground">{dayData.calories}</span>
                        </div>
                      )}
                      {dayData.carbs && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">Carbohydrate</span>
                          <span className="font-semibold text-foreground">{dayData.carbs}</span>
                        </div>
                      )}
                      {dayData.protein && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">Protein</span>
                          <span className="font-semibold text-foreground">{dayData.protein}</span>
                        </div>
                      )}
                      {dayData.fat && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">Fat</span>
                          <span className="font-semibold text-foreground">{dayData.fat}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Micros - same for all days */}
                  <div className="bg-[hsl(45,50%,30%)/0.6] p-4 rounded-lg">
                    <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">KEY MICROS</h4>
                    <div className="space-y-2 text-sm">
                      {program.micro_1_name && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">{program.micro_1_name}</span>
                          <span className="font-semibold text-foreground">{program.micro_1_amount}</span>
                        </div>
                      )}
                      {program.micro_2_name && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">{program.micro_2_name}</span>
                          <span className="font-semibold text-foreground">{program.micro_2_amount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplements - same for all days */}
                  <div className="bg-[hsl(45,40%,35%)/0.5] p-4 rounded-lg">
                    <h4 className="text-sm font-bold text-[hsl(43,80%,70%)] underline mb-3">SUPPLEMENTS</h4>
                    <div className="space-y-2 text-sm">
                      {program.supplement_1_name && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">{program.supplement_1_name}</span>
                          <span className="font-semibold text-foreground">{program.supplement_1_amount}</span>
                        </div>
                      )}
                      {program.supplement_2_name && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">{program.supplement_2_name}</span>
                          <span className="font-semibold text-foreground">{program.supplement_2_amount}</span>
                        </div>
                      )}
                      {program.supplement_3_name && (
                        <div className="flex justify-between">
                          <span className="text-[hsl(43,60%,60%)]">{program.supplement_3_name}</span>
                          <span className="font-semibold text-foreground">{program.supplement_3_amount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Day Indicator Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {(["training", "match", "recovery"] as DayType[]).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      selectedDay === day
                        ? "bg-primary scale-110"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            <Button
              variant="ghost"
              className="rounded-none h-auto px-2 md:px-4 bg-muted/30 hover:bg-muted/50"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
