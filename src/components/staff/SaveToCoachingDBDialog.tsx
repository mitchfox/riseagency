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

// Main sessions only - pre-sessions are bundled with their main session
const mainSessionLabels = [
  { key: 'sessionA', preKey: 'preSessionA', label: 'Session A' },
  { key: 'sessionB', preKey: 'preSessionB', label: 'Session B' },
  { key: 'sessionC', preKey: 'preSessionC', label: 'Session C' },
  { key: 'sessionD', preKey: 'preSessionD', label: 'Session D' },
  { key: 'sessionE', preKey: 'preSessionE', label: 'Session E' },
  { key: 'sessionF', preKey: 'preSessionF', label: 'Session F' },
  { key: 'sessionG', preKey: 'preSessionG', label: 'Session G' },
  { key: 'sessionH', preKey: 'preSessionH', label: 'Session H' },
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
      
      // Initialize session settings - only main sessions (pre-sessions bundled)
      const initialSettings: { [key: string]: { selected: boolean; name: string } } = {};
      mainSessionLabels.forEach(({ key, preKey, label }) => {
        const mainSession = programmingData[key as keyof typeof programmingData] as SessionData;
        const preSession = programmingData[preKey as keyof typeof programmingData] as SessionData;
        const mainCount = mainSession?.exercises?.length || 0;
        const preCount = preSession?.exercises?.length || 0;
        initialSettings[key] = {
          selected: false,
          name: `${label} - ${programmingData.phaseName || programName || 'Untitled'}`
        };
      });
      setSessionSaveSettings(initialSettings);
    }
  }, [isOpen, programmingData, programName]);

  // Get total exercise count for a main session (includes pre-session)
  const getSessionExerciseCount = (key: string): number => {
    const sessionInfo = mainSessionLabels.find(s => s.key === key);
    if (!sessionInfo) return 0;
    
    const mainSession = programmingData[key as keyof typeof programmingData] as SessionData;
    const preSession = programmingData[sessionInfo.preKey as keyof typeof programmingData] as SessionData;
    
    const mainCount = mainSession?.exercises?.length || 0;
    const preCount = preSession?.exercises?.length || 0;
    
    return mainCount + preCount;
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
      mainSessionLabels.forEach(({ key }) => {
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

      // Save selected sessions (including bundled pre-sessions)
      if (selectedSessions.length > 0) {
        const sessionsToSave = selectedSessions.map(([key, settings]) => {
          // Find the corresponding session info with preKey
          const sessionInfo = mainSessionLabels.find(s => s.key === key);
          
          const mainSession = programmingData[key as keyof typeof programmingData] as SessionData;
          const preSession = sessionInfo 
            ? programmingData[sessionInfo.preKey as keyof typeof programmingData] as SessionData
            : { exercises: [] };
          
          // Combine pre-session and main session exercises
          const preExercises = deepClone(preSession?.exercises || []);
          const mainExercises = deepClone(mainSession?.exercises || []);
          const allExercises = [...preExercises, ...mainExercises];
          
          return {
            title: settings.name,
            description: `Saved from programming - ${allExercises.length} exercises (${preExercises.length} pre + ${mainExercises.length} main)`,
            category: 'Player Programming',
            exercises: allExercises as unknown as any
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
  const sessionsWithExercises = mainSessionLabels.filter(({ key }) => getSessionExerciseCount(key) > 0);

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
                {mainSessionLabels.map(({ key, preKey, label }) => {
                  const exerciseCount = getSessionExerciseCount(key);
                  const settings = sessionSaveSettings[key];
                  
                  // Get breakdown of pre vs main exercises
                  const mainSession = programmingData[key as keyof typeof programmingData] as SessionData;
                  const preSession = programmingData[preKey as keyof typeof programmingData] as SessionData;
                  const mainCount = mainSession?.exercises?.length || 0;
                  const preCount = preSession?.exercises?.length || 0;
                  
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
                            <div className="flex gap-1">
                              {preCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {preCount} pre
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {mainCount} main
                              </Badge>
                            </div>
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
