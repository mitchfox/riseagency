import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, parseISO, isSameDay, addWeeks } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  competition: string | null;
  venue: string | null;
}

export const StaffSchedule = ({ isAdmin }: { isAdmin: boolean }) => {
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [programEndDates, setProgramEndDates] = useState<ProgramEndDate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFixturesDialog, setShowFixturesDialog] = useState(false);
  const [selectedFixturePlayer, setSelectedFixturePlayer] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractedFixtures, setExtractedFixtures] = useState<any[]>([]);
  const [selectedFixtures, setSelectedFixtures] = useState<Set<number>>(new Set());
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCurrentPrograms();
    loadAllPlayers();
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date');
      
      if (error) throw error;
      setFixtures(data || []);
    } catch (error) {
      console.error('Error loading fixtures:', error);
    }
  };

  const loadAllPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, club')
        .order('name');
      
      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedFixturePlayer) {
      toast.error("Please select a player first");
      return;
    }

    const player = allPlayers.find(p => p.id === selectedFixturePlayer);
    if (!player) {
      toast.error("Player not found");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('extract-fixtures-from-image', {
          body: {
            image: base64Image,
            teamName: player.club || player.name,
            playerName: player.name
          }
        });

        if (error) throw error;

        setExtractedFixtures(data.fixtures || []);
        toast.success(`Extracted ${data.fixtures?.length || 0} fixtures from image`);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error extracting fixtures:', error);
      toast.error(`Failed to extract fixtures: ${error.message}`);
      setUploadingImage(false);
    }
  };

  const addFixturesToDatabase = async () => {
    if (selectedFixtures.size === 0) {
      toast.error('Please select at least one fixture');
      return;
    }

    const fixturesToAdd = Array.from(selectedFixtures).map(idx => extractedFixtures[idx]);

    try {
      const { error } = await supabase
        .from('fixtures')
        .insert(
          fixturesToAdd.map(fixture => ({
            home_team: fixture.home_team,
            away_team: fixture.away_team,
            match_date: fixture.match_date,
            competition: fixture.competition || null,
            venue: fixture.venue || null,
            home_score: fixture.home_score,
            away_score: fixture.away_score
          }))
        );

      if (error) throw error;

      toast.success(`Added ${selectedFixtures.size} fixture(s) to database`);
      setShowFixturesDialog(false);
      setSelectedFixtures(new Set());
      setExtractedFixtures([]);
      fetchFixtures();
    } catch (error: any) {
      console.error('Error adding fixtures:', error);
      toast.error(`Failed to add fixtures: ${error.message}`);
    }
  };

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
    const offsetWeekStart = addWeeks(currentWeekStart, weekOffset * 6); // Move by 6 weeks at a time
    const weeks = [];

    for (let i = 0; i < 6; i++) {
      const weekStart = addDays(offsetWeekStart, i * 7);
      weeks.push(weekStart);
    }

    return weeks;
  };

  const getFixturesForDay = (date: Date): Fixture[] => {
    return fixtures.filter(fixture => 
      isSameDay(parseISO(fixture.match_date), date)
    );
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
      <>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setWeekOffset(weekOffset - 1)} 
            size="sm" 
            variant="outline"
            className={isMobile ? "h-7 w-7 p-0" : ""}
          >
            <ChevronLeft className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
          <p className={`text-muted-foreground ${isMobile ? "text-xs" : ""}`}>
            {weekOffset === 0 ? 'Next' : weekOffset > 0 ? `${weekOffset * 6} weeks ahead` : `${Math.abs(weekOffset * 6)} weeks ago`} 
            {' '}• {programs.length} active program{programs.length !== 1 ? 's' : ''}
          </p>
          <Button 
            onClick={() => setWeekOffset(weekOffset + 1)} 
            size="sm" 
            variant="outline"
            className={isMobile ? "h-7 w-7 p-0" : ""}
          >
            <ChevronRight className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
        </div>
        {!isMobile && (
          <Button onClick={() => setShowFixturesDialog(true)} size="sm" variant="secondary">
            <Calendar className="w-4 h-4 mr-2" />
            Add Fixtures
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className={isMobile ? "" : "overflow-x-auto"}>
        <div className={isMobile ? "w-full" : "min-w-[800px]"}>
          {/* Header Row */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-8'} gap-2 mb-2`}>
            <div 
              className={`${isMobile ? 'p-1.5' : 'p-3'} text-center font-bebas uppercase ${isMobile ? 'text-[10px]' : 'text-sm'} rounded-lg`}
              style={{ 
                backgroundColor: 'hsl(43, 49%, 61%)',
                color: 'hsl(0, 0%, 0%)'
              }}
            >
              {isMobile ? 'Today' : 'Week Start'}
            </div>
            {(isMobile ? [format(new Date(), 'EEE')] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day) => (
              <div 
                key={day}
                className={`${isMobile ? 'p-1.5' : 'p-3'} text-center font-bebas uppercase ${isMobile ? 'text-[10px]' : 'text-sm'} rounded-lg`}
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
            {(isMobile ? [calendarWeeks[0]] : calendarWeeks).map((weekStart, weekIndex) => {
              const today = new Date();
              const todayDayOffset = isMobile ? today.getDay() === 0 ? 6 : today.getDay() - 1 : null; // Convert Sunday=0 to 6, others -1
              
              return (
              <div key={weekIndex} className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-8'} gap-2`}>
                {/* Week Start Cell */}
                <div 
                  className={`${isMobile ? 'p-1.5' : 'p-3'} rounded-lg flex flex-col items-center justify-center border`}
                  style={{ 
                    backgroundColor: isMobile ? 'hsl(43, 49%, 61%)' : isCurrentWeek(weekStart) ? 'hsl(43, 49%, 61%)' : 'hsl(0, 0%, 95%)',
                    color: 'hsl(0, 0%, 0%)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold`}>
                    {format(isMobile ? today : weekStart, 'd')}
                    <sup className={isMobile ? "text-[8px]" : "text-xs"}>
                      {(() => {
                        const day = format(isMobile ? today : weekStart, 'd');
                        return day.endsWith('1') && day !== '11' ? 'st' :
                               day.endsWith('2') && day !== '12' ? 'nd' :
                               day.endsWith('3') && day !== '13' ? 'rd' : 'th';
                      })()}
                    </sup>
                  </div>
                  <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} font-medium italic`}>
                    {format(isMobile ? today : weekStart, 'MMM')}
                  </div>
                </div>

                {/* Day Cells */}
                {(isMobile ? [todayDayOffset!] : [0, 1, 2, 3, 4, 5, 6]).map((dayOffset) => {
                  const currentDate = addDays(weekStart, dayOffset);
                  const endDates = getEndDatesForDay(currentDate);
                  const dayFixtures = getFixturesForDay(currentDate);
                  const hasEndDates = endDates.length > 0;
                  const hasFixtures = dayFixtures.length > 0;
                  const isToday = isSameDay(currentDate, new Date());
                  const dayKey = `${weekIndex}-${dayOffset}`;
                  const isExpanded = expandedDays.has(dayKey);
                  
                  // Combine all items
                  const allItems = [
                    ...endDates.map(ed => ({ type: 'endDate' as const, data: ed })),
                    ...dayFixtures.map(f => ({ type: 'fixture' as const, data: f }))
                  ];
                  const displayItems = isExpanded ? allItems : allItems.slice(0, 2);
                  const remainingCount = allItems.length - 2;

                  return (
                    <div 
                      key={dayOffset}
                      className={`${isMobile ? 'p-1' : 'p-3'} rounded-lg ${isMobile ? 'min-h-[60px]' : 'min-h-[80px]'} relative border transition-all`}
                      style={{ 
                        backgroundColor: hasEndDates ? 'hsl(0, 50%, 35%)' : 'hsl(0, 0%, 10%)',
                        borderColor: isToday ? 'hsl(43, 49%, 61%)' : hasEndDates ? 'hsl(0, 50%, 50%)' : 'rgba(255, 255, 255, 0.1)',
                        borderWidth: isToday ? '2px' : '1px'
                      }}
                    >
                      {/* Day number in top right */}
                      <span 
                        className={`absolute top-0.5 right-0.5 ${isMobile ? 'text-[7px]' : 'text-xs'} opacity-40`}
                        style={{ color: 'hsl(0, 0%, 100%)' }}
                      >
                        {format(currentDate, 'd')}
                      </span>

                      {/* Display items */}
                      {allItems.length > 0 && (
                        <div className={`flex flex-col gap-0.5 ${isMobile ? 'mt-2' : 'mt-4'}`}>
                          {displayItems.map((item, idx) => (
                            item.type === 'endDate' ? (
                              <div 
                                key={`end-${idx}`}
                                className={`${isMobile ? 'text-[10px] p-1' : 'text-xs p-1'} rounded`}
                                style={{ 
                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                  color: 'hsl(0, 0%, 0%)'
                                }}
                                title={`${item.data.playerName} - ${item.data.programName}${item.data.phaseName ? ` (${item.data.phaseName})` : ''}`}
                              >
                                <div className={`font-bold truncate ${isMobile ? 'text-xs' : ''}`}>{item.data.playerName}</div>
                                <div className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} truncate opacity-75`}>{item.data.phaseName || item.data.programName}</div>
                              </div>
                            ) : (
                              <div 
                                key={`fixture-${idx}`}
                                className={`${isMobile ? 'text-[10px] p-1' : 'text-xs p-1'} rounded border border-dashed opacity-70`}
                                style={{ 
                                  backgroundColor: 'hsl(0, 0%, 20%)',
                                  borderColor: 'hsl(0, 0%, 40%)',
                                  color: 'hsl(0, 0%, 90%)'
                                }}
                                title={`${item.data.home_team} vs ${item.data.away_team}${item.data.competition ? ` - ${item.data.competition}` : ''}`}
                              >
                                <div className={`truncate ${isMobile ? 'font-semibold' : ''}`}>⚽ {item.data.home_team}</div>
                                <div className={`truncate ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>vs {item.data.away_team}</div>
                              </div>
                            )
                          ))}
                          
                          {/* Show more button */}
                          {!isExpanded && remainingCount > 0 && (
                            <button
                              onClick={() => setExpandedDays(prev => new Set([...prev, dayKey]))}
                              onMouseEnter={() => setExpandedDays(prev => new Set([...prev, dayKey]))}
                              className={`${isMobile ? 'text-[8px] p-0.5' : 'text-xs p-1'} rounded font-bold transition-all hover:scale-105`}
                              style={{ 
                                backgroundColor: 'hsl(43, 49%, 61%)',
                                color: 'hsl(0, 0%, 0%)'
                              }}
                            >
                              +{remainingCount}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'} ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground pt-4 border-t`}>
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
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-dashed"
            style={{ 
              backgroundColor: 'hsl(0, 0%, 20%)',
              borderColor: 'hsl(0, 0%, 40%)'
            }}
          />
          <span>Fixtures</span>
        </div>
      </div>

      {programEndDates.length === 0 && fixtures.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          No program end dates or fixtures found in the displayed period
        </div>
      )}
    </div>

    {/* Fixtures Dialog */}
    <Dialog open={showFixturesDialog} onOpenChange={setShowFixturesDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Fixtures from Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Player</Label>
            <Select value={selectedFixturePlayer} onValueChange={setSelectedFixturePlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a player..." />
              </SelectTrigger>
              <SelectContent>
                {allPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} {player.club ? `(${player.club})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Upload Fixtures Image</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={!selectedFixturePlayer || uploadingImage}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
            {uploadingImage && <p className="text-sm text-muted-foreground mt-2">Extracting fixtures from image...</p>}
          </div>

          {extractedFixtures.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Extracted Fixtures (select to add)</Label>
                <Badge variant="secondary">{selectedFixtures.size} selected</Badge>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {extractedFixtures.map((fixture, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFixtures.has(idx)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedFixtures);
                      if (newSelected.has(idx)) {
                        newSelected.delete(idx);
                      } else {
                        newSelected.add(idx);
                      }
                      setSelectedFixtures(newSelected);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">
                          {fixture.home_team} vs {fixture.away_team}
                          {(fixture.home_score !== null || fixture.away_score !== null) && (
                            <span className="ml-2 text-muted-foreground">
                              ({fixture.home_score ?? '-'} - {fixture.away_score ?? '-'})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {fixture.competition && ` • ${fixture.competition}`}
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedFixtures.has(idx)}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedFixtures);
                          if (newSelected.has(idx)) {
                            newSelected.delete(idx);
                          } else {
                            newSelected.add(idx);
                          }
                          setSelectedFixtures(newSelected);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowFixturesDialog(false);
                  setExtractedFixtures([]);
                  setSelectedFixtures(new Set());
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={addFixturesToDatabase}
                  disabled={selectedFixtures.size === 0}
                >
                  Add {selectedFixtures.size} Fixture{selectedFixtures.size !== 1 ? 's' : ''} to Database
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
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
