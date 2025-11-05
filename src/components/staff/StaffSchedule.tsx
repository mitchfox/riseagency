import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PlayerProgram {
  id: string;
  program_name: string;
  phase_name: string | null;
  phase_dates: string | null;
  weekly_schedules: any;
  end_date: string | null;
  player_id: string;
  player_name: string;
}

interface ProgramEndDate {
  date: Date;
  playerName: string;
  programName: string;
  phaseName: string | null;
}

export const StaffSchedule = ({ isAdmin }: { isAdmin: boolean }) => {
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [programEndDates, setProgramEndDates] = useState<ProgramEndDate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentPrograms();
  }, []);

  const fetchCurrentPrograms = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("player_programs")
        .select(`
          id,
          program_name,
          phase_name,
          phase_dates,
          weekly_schedules,
          end_date,
          player_id,
          players!inner(name)
        `)
        .eq("is_current", true)
        .order("player_id");

      if (error) throw error;

      const programsWithPlayerNames = (data || []).map((p: any) => ({
        ...p,
        player_name: p.players?.name || "Unknown Player",
      }));

      setPrograms(programsWithPlayerNames);

      // Use stored end_date from database
      const endDates: ProgramEndDate[] = [];
      programsWithPlayerNames.forEach((program: PlayerProgram) => {
        if (program.end_date) {
          try {
            const parsedDate = parseISO(program.end_date);
            // Validate the date is valid
            if (!isNaN(parsedDate.getTime())) {
              endDates.push({
                date: parsedDate,
                playerName: program.player_name,
                programName: program.program_name,
                phaseName: program.phase_name,
              });
            }
          } catch (e) {
            console.error("Invalid date format for program:", program.program_name, e);
          }
        }
      });

      setProgramEndDates(endDates);
    } catch (error: any) {
      console.error("Error fetching programs:", error);
      setError(error.message || "Failed to load program schedules");
      toast.error("Failed to load program schedules");
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarWeeks = () => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weeks = [];

    for (let i = 0; i < 6; i++) {
      const weekStart = addDays(currentWeekStart, i * 7);
      weeks.push(weekStart);
    }

    return weeks;
  };

  const getEndDatesForDay = (date: Date): ProgramEndDate[] => {
    return programEndDates.filter(endDate => 
      isSameDay(endDate.date, date)
    );
  };

  const isCurrentWeek = (weekStart: Date) => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    return isSameDay(weekStart, currentWeekStart);
  };

  const calendarWeeks = generateCalendarWeeks();

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading schedule...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">Error loading schedule: {error}</p>
        <Button onClick={fetchCurrentPrograms} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  try {
    return (
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing next 6 weeks • {programs.length} active program{programs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div 
              className="p-3 text-center font-bebas uppercase text-sm rounded-lg"
              style={{ 
                backgroundColor: 'hsl(43, 49%, 61%)',
                color: 'hsl(0, 0%, 0%)'
              }}
            >
              Week Start
            </div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div 
                key={day}
                className="p-3 text-center font-bebas uppercase text-sm rounded-lg"
                style={{ 
                  backgroundColor: 'hsl(43, 49%, 61%)',
                  color: 'hsl(0, 0%, 0%)'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Week Rows */}
          <div className="space-y-2">
            {calendarWeeks.map((weekStart, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-8 gap-2">
                {/* Week Start Cell */}
                <div 
                  className="p-3 rounded-lg flex flex-col items-center justify-center border"
                  style={{ 
                    backgroundColor: isCurrentWeek(weekStart) ? 'hsl(43, 49%, 61%)' : 'hsl(0, 0%, 95%)',
                    color: 'hsl(0, 0%, 0%)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="text-2xl font-bold">
                    {format(weekStart, 'd')}
                    <sup className="text-xs">
                      {(() => {
                        const day = format(weekStart, 'd');
                        return day.endsWith('1') && day !== '11' ? 'st' :
                               day.endsWith('2') && day !== '12' ? 'nd' :
                               day.endsWith('3') && day !== '13' ? 'rd' : 'th';
                      })()}
                    </sup>
                  </div>
                  <div className="text-xs font-medium italic">
                    {format(weekStart, 'MMMM')}
                  </div>
                </div>

                {/* Day Cells */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                  const currentDate = addDays(weekStart, dayOffset);
                  const endDates = getEndDatesForDay(currentDate);
                  const hasEndDates = endDates.length > 0;
                  const isToday = isSameDay(currentDate, new Date());

                  return (
                    <div 
                      key={dayOffset}
                      className="p-3 rounded-lg min-h-[80px] relative border transition-all"
                      style={{ 
                        backgroundColor: hasEndDates ? 'hsl(0, 50%, 35%)' : 'hsl(0, 0%, 10%)',
                        borderColor: isToday ? 'hsl(43, 49%, 61%)' : hasEndDates ? 'hsl(0, 50%, 50%)' : 'rgba(255, 255, 255, 0.1)',
                        borderWidth: isToday ? '2px' : '1px'
                      }}
                    >
                      {/* Day number in top right */}
                      <span 
                        className="absolute top-1 right-1 text-xs opacity-50"
                        style={{ color: 'hsl(0, 0%, 100%)' }}
                      >
                        {format(currentDate, 'd')}
                      </span>

                      {/* Program end markers */}
                      {hasEndDates && (
                        <div className="flex flex-col gap-1 mt-4">
                          {endDates.map((endDate, idx) => (
                            <div 
                              key={idx}
                              className="text-xs p-1 rounded"
                              style={{ 
                                backgroundColor: 'hsl(43, 49%, 61%)',
                                color: 'hsl(0, 0%, 0%)'
                              }}
                              title={`${endDate.playerName} - ${endDate.programName}${endDate.phaseName ? ` (${endDate.phaseName})` : ''}`}
                            >
                              <div className="font-bold truncate">{endDate.playerName}</div>
                              <div className="text-[10px] truncate opacity-75">{endDate.phaseName || endDate.programName}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'hsl(43, 49%, 61%)' }}
          />
          <span>Current Week</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ 
              backgroundColor: 'hsl(0, 50%, 35%)',
              borderColor: 'hsl(0, 50%, 50%)'
            }}
          />
          <span>Program Ends</span>
        </div>
      </div>

      {programEndDates.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          No program end dates found in the next 6 weeks
        </div>
      )}
    </div>
  );
  } catch (renderError: any) {
    console.error("Error rendering schedule:", renderError);
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">Error displaying schedule</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </Button>
      </div>
    );
  }
};
