import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, FileText, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Exercise {
  name: string;
  description: string;
  repetitions: string;
  sets: string;
  load: string;
  recoveryTime: string;
  videoUrl: string;
}

interface SessionData {
  exercises: Exercise[];
}

interface WeeklySchedule {
  week?: string;
  week_start_date: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  mondayColor: string;
  tuesdayColor: string;
  wednesdayColor: string;
  thursdayColor: string;
  fridayColor: string;
  saturdayColor: string;
  sundayColor: string;
  scheduleNotes: string;
  [key: string]: string | undefined;
}

interface SaveToCoachingDBDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programmingData: {
    phaseName: string;
    phaseDates: string;
    overviewText: string;
    sessionA: SessionData;
    sessionB: SessionData;
    sessionC: SessionData;
    sessionD: SessionData;
    sessionE: SessionData;
    sessionF: SessionData;
    sessionG: SessionData;
    sessionH: SessionData;
    preSessionA: SessionData;
    preSessionB: SessionData;
    preSessionC: SessionData;
    preSessionD: SessionData;
    preSessionE: SessionData;
    preSessionF: SessionData;
    preSessionG: SessionData;
    preSessionH: SessionData;
    weeklySchedules: any[];
  };
  programName: string;
}

const sessionLabels = [
  { key: 'preSessionA', label: 'Pre-A' },
  { key: 'sessionA', label: 'Session A' },
  { key: 'preSessionB', label: 'Pre-B' },
  { key: 'sessionB', label: 'Session B' },
  { key: 'preSessionC', label: 'Pre-C' },
  { key: 'sessionC', label: 'Session C' },
  { key: 'preSessionD', label: 'Pre-D' },
  { key: 'sessionD', label: 'Session D' },
  { key: 'preSessionE', label: 'Pre-E' },
  { key: 'sessionE', label: 'Session E' },
  { key: 'preSessionF', label: 'Pre-F' },
  { key: 'sessionF', label: 'Session F' },
  { key: 'preSessionG', label: 'Pre-G' },
  { key: 'sessionG', label: 'Session G' },
  { key: 'preSessionH', label: 'Pre-H' },
  { key: 'sessionH', label: 'Session H' },
];

// Deep clone utility to ensure complete independence
const deepClone = <T,>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const SaveToCoachingDBDialog = ({ 
  isOpen, 
  onClose, 
  programmingData,
  programName 
}: SaveToCoachingDBDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'programme' | 'sessions'>('programme');
  
  // Programme state
  const [programmeName, setProgrammeName] = useState('');
  const [saveProgramme, setSaveProgramme] = useState(false);
  
  // Sessions state - track which sessions to save and their names
  const [sessionSaveSettings, setSessionSaveSettings] = useState<{
    [key: string]: { selected: boolean; name: string };
  }>({});

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set default programme name
      setProgrammeName(programmingData.phaseName || programName || 'Untitled Programme');
      setSaveProgramme(false);
      
      // Initialize session settings
      const initialSettings: { [key: string]: { selected: boolean; name: string } } = {};
      sessionLabels.forEach(({ key, label }) => {
        const session = programmingData[key as keyof typeof programmingData] as SessionData;
        const hasExercises = session?.exercises?.length > 0;
        initialSettings[key] = {
          selected: false,
          name: `${label} - ${programmingData.phaseName || programName || 'Untitled'}`
        };
      });
      setSessionSaveSettings(initialSettings);
    }
  }, [isOpen, programmingData, programName]);

  const getSessionExerciseCount = (key: string): number => {
    const session = programmingData[key as keyof typeof programmingData] as SessionData;
    return session?.exercises?.length || 0;
  };

  const toggleSessionSelection = (key: string) => {
    setSessionSaveSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], selected: !prev[key].selected }
    }));
  };

  const updateSessionName = (key: string, name: string) => {
    setSessionSaveSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], name }
    }));
  };

  const selectAllSessions = () => {
    setSessionSaveSettings(prev => {
      const updated = { ...prev };
      sessionLabels.forEach(({ key }) => {
        if (getSessionExerciseCount(key) > 0) {
          updated[key] = { ...updated[key], selected: true };
        }
      });
      return updated;
    });
  };

  const deselectAllSessions = () => {
    setSessionSaveSettings(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = { ...updated[key], selected: false };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    const selectedSessions = Object.entries(sessionSaveSettings)
      .filter(([_, settings]) => settings.selected);
    
    if (!saveProgramme && selectedSessions.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }

    setSaving(true);
    try {
      // Save programme if selected
      if (saveProgramme) {
        const sessionsClone = deepClone({
          A: programmingData.sessionA,
          B: programmingData.sessionB,
          C: programmingData.sessionC,
          D: programmingData.sessionD,
          E: programmingData.sessionE,
          F: programmingData.sessionF,
          G: programmingData.sessionG,
          H: programmingData.sessionH,
          'PRE-A': programmingData.preSessionA,
          'PRE-B': programmingData.preSessionB,
          'PRE-C': programmingData.preSessionC,
          'PRE-D': programmingData.preSessionD,
          'PRE-E': programmingData.preSessionE,
          'PRE-F': programmingData.preSessionF,
          'PRE-G': programmingData.preSessionG,
          'PRE-H': programmingData.preSessionH,
        });
        
        const schedulesClone = deepClone(programmingData.weeklySchedules);
        
        const { error } = await supabase.from('coaching_programmes').insert([{
          title: programmeName,
          description: `${programmeName} - ${programmingData.phaseDates || 'No dates'}`,
          content: programmingData.overviewText,
          category: 'Player Programming',
          attachments: {
            sessions: sessionsClone,
            weekly_schedules: schedulesClone
          } as any
        }]);
        
        if (error) throw error;
        toast.success(`Programme "${programmeName}" saved to database`);
      }

      // Save selected sessions
      if (selectedSessions.length > 0) {
        const sessionsToSave = selectedSessions.map(([key, settings]) => {
          const session = programmingData[key as keyof typeof programmingData] as SessionData;
          // Deep clone exercises to ensure complete independence
          const exercisesClone = deepClone(session.exercises);
          
          return {
            title: settings.name,
            description: `Saved from programming - ${exercisesClone.length} exercises`,
            category: 'Player Programming',
            exercises: exercisesClone as unknown as any,
            content: exercisesClone.map((ex: Exercise) => 
              `${ex.name}: ${ex.sets} sets x ${ex.repetitions} reps @ ${ex.load}, ${ex.recoveryTime} rest`
            ).join('\n')
          };
        });

        const { error } = await supabase.from('coaching_sessions').insert(sessionsToSave as any);
        if (error) throw error;
        toast.success(`${selectedSessions.length} session(s) saved to database`);
      }

      onClose();
    } catch (error) {
      console.error('Error saving to coaching database:', error);
      toast.error('Failed to save to coaching database');
    } finally {
      setSaving(false);
    }
  };

  const selectedSessionCount = Object.values(sessionSaveSettings).filter(s => s.selected).length;
  const sessionsWithExercises = sessionLabels.filter(({ key }) => getSessionExerciseCount(key) > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save to Coaching Database
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Save copies of this programme or individual sessions to the coaching database for reuse.
          These will be independent copies that won't affect the original.
        </p>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'programme' | 'sessions')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="programme" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Programme
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Sessions ({sessionsWithExercises.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programme" className="space-y-4 mt-4">
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <Checkbox
                id="save-programme-check"
                checked={saveProgramme}
                onCheckedChange={(checked) => setSaveProgramme(checked as boolean)}
              />
              <div className="flex-1 space-y-2">
                <label htmlFor="save-programme-check" className="font-medium cursor-pointer">
                  Save entire programme as template
                </label>
                <p className="text-sm text-muted-foreground">
                  Includes all sessions, weekly schedules, and overview text
                </p>
                {saveProgramme && (
                  <div className="pt-2">
                    <Label htmlFor="programme-name">Programme Name</Label>
                    <Input
                      id="programme-name"
                      value={programmeName}
                      onChange={(e) => setProgrammeName(e.target.value)}
                      placeholder="Enter programme name..."
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Select sessions to save as reusable templates
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllSessions}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllSessions}>
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {sessionLabels.map(({ key, label }) => {
                  const exerciseCount = getSessionExerciseCount(key);
                  const settings = sessionSaveSettings[key];
                  
                  if (exerciseCount === 0) return null;
                  
                  return (
                    <div 
                      key={key} 
                      className={`p-3 border rounded-lg transition-colors ${
                        settings?.selected ? 'bg-primary/5 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`session-${key}`}
                          checked={settings?.selected || false}
                          onCheckedChange={() => toggleSessionSelection(key)}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <label 
                              htmlFor={`session-${key}`} 
                              className="font-medium cursor-pointer"
                            >
                              {label}
                            </label>
                            <Badge variant="secondary" className="text-xs">
                              {exerciseCount} exercises
                            </Badge>
                          </div>
                          {settings?.selected && (
                            <Input
                              value={settings.name}
                              onChange={(e) => updateSessionName(key, e.target.value)}
                              placeholder="Session name in database..."
                              className="text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {sessionsWithExercises.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No sessions with exercises to save
                  </p>
                )}
              </div>
            </ScrollArea>

            {selectedSessionCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedSessionCount} session(s) selected to save
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || (!saveProgramme && selectedSessionCount === 0)}
          >
            {saving ? 'Saving...' : 'Save to Database'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
