import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, Edit, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Database } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExerciseDatabaseSelector } from "./ExerciseDatabaseSelector";

interface ProgrammingManagementProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

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
}

interface ProgrammingData {
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
  weeklySchedules: WeeklySchedule[];
  testing: string;
}

const sessionLabels = [
  { key: 'sessionA', label: 'Session A' },
  { key: 'sessionB', label: 'Session B' },
  { key: 'sessionC', label: 'Session C' },
  { key: 'sessionD', label: 'Session D' },
  { key: 'sessionE', label: 'Session E' },
  { key: 'sessionF', label: 'Session F' },
  { key: 'sessionG', label: 'Session G' },
  { key: 'sessionH', label: 'Session H' },
];

const emptyExercise = (): Exercise => ({
  name: '',
  description: '',
  repetitions: '',
  sets: '',
  load: '',
  recoveryTime: '',
  videoUrl: ''
});

const emptySession = (): SessionData => ({
  exercises: [],
});

const emptyWeeklySchedule = (): WeeklySchedule => ({
  week: '',
  week_start_date: '',
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '',
  mondayColor: '', tuesdayColor: '', wednesdayColor: '', thursdayColor: '', fridayColor: '', saturdayColor: '', sundayColor: '',
  scheduleNotes: ''
});

const initialProgrammingData = (): ProgrammingData => ({
  phaseName: '',
  phaseDates: '',
  overviewText: '',
  sessionA: emptySession(),
  sessionB: emptySession(),
  sessionC: emptySession(),
  sessionD: emptySession(),
  sessionE: emptySession(),
  sessionF: emptySession(),
  sessionG: emptySession(),
  sessionH: emptySession(),
  weeklySchedules: [],
  testing: '',
});

export const ProgrammingManagement = ({ isOpen, onClose, playerId, playerName }: ProgrammingManagementProps) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [programmingData, setProgrammingData] = useState<ProgrammingData>(initialProgrammingData());
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [showUploadProgram, setShowUploadProgram] = useState(false);
  const [saveToCoachingDB, setSaveToCoachingDB] = useState({
    programme: false,
    sessions: false,
    exercises: false
  });
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen && playerId) {
      loadPrograms();
    }
  }, [isOpen, playerId]);

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('player_programs')
        .select('*')
        .eq('player_id', playerId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const loadProgramDetails = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('player_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;

      const sessions = (data.sessions || {}) as any;
      const weeklySchedules = (data.weekly_schedules || []) as any[];

      setSelectedProgram(data);
      setProgrammingData({
        phaseName: data.phase_name || '',
        phaseDates: data.phase_dates || '',
        overviewText: data.overview_text || '',
        sessionA: sessions.A || sessions.sessionA || emptySession(),
        sessionB: sessions.B || sessions.sessionB || emptySession(),
        sessionC: sessions.C || sessions.sessionC || emptySession(),
        sessionD: sessions.D || sessions.sessionD || emptySession(),
        sessionE: sessions.E || sessions.sessionE || emptySession(),
        sessionF: sessions.F || sessions.sessionF || emptySession(),
        sessionG: sessions.G || sessions.sessionG || emptySession(),
        sessionH: sessions.H || sessions.sessionH || emptySession(),
        weeklySchedules: weeklySchedules,
        testing: ''
      });
    } catch (error) {
      console.error('Error loading program details:', error);
      toast.error('Failed to load program details');
    }
  };

  const createNewProgram = async () => {
    if (!newProgramName.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    setLoading(true);
    try {
      // Get max display_order for this player
      const { data: existingPrograms } = await supabase
        .from('player_programs')
        .select('display_order')
        .eq('player_id', playerId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPrograms && existingPrograms.length > 0 
        ? (existingPrograms[0].display_order || 0) + 1 
        : 1;

      // If Excel file is uploaded, process it with AI
      let aiParsedData: any = null;
      if (excelFile) {
        setUploadingExcel(true);
        try {
          const formData = new FormData();
          formData.append('file', excelFile);

          // Get the session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Authentication required');
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-program-excel`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to parse file');
          }

          const result = await response.json();
          aiParsedData = result.data;
          toast.success('File parsed successfully!');
        } catch (error: any) {
          console.error('Error parsing file:', error);
          toast.error(`Failed to parse file: ${error.message}`);
          setUploadingExcel(false);
          setLoading(false);
          return;
        } finally {
          setUploadingExcel(false);
        }
      }

      // Create the program with AI-parsed data if available
      const programData: any = {
        player_id: playerId,
        program_name: newProgramName,
        is_current: programs.length === 0,
        display_order: nextOrder
      };

      if (aiParsedData) {
        programData.phase_name = aiParsedData.phaseName;
        programData.phase_dates = aiParsedData.phaseDates;
        programData.overview_text = aiParsedData.overviewText;
        programData.sessions = aiParsedData.sessions;
        programData.weekly_schedules = aiParsedData.weeklySchedules;
      } else {
        programData.sessions = {};
        programData.weekly_schedules = [];
      }

      const { error, data: newProgram } = await supabase
        .from('player_programs')
        .insert(programData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Program created successfully');
      setNewProgramName('');
      setExcelFile(null);
      setIsCreatingNew(false);
      
      // If AI data was used, open the program for editing/review
      if (aiParsedData && newProgram) {
        loadProgramDetails(newProgram.id);
      } else {
        loadPrograms();
      }
    } catch (error) {
      console.error('Error creating program:', error);
      toast.error('Failed to create program');
    } finally {
      setLoading(false);
    }
  };

  const moveProgram = async (programId: string, direction: 'up' | 'down') => {
    const currentIndex = programs.findIndex(p => p.id === programId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= programs.length) return;

    setLoading(true);
    try {
      const currentProgram = programs[currentIndex];
      const targetProgram = programs[targetIndex];

      // Swap display orders
      await supabase
        .from('player_programs')
        .update({ display_order: targetProgram.display_order })
        .eq('id', currentProgram.id);

      await supabase
        .from('player_programs')
        .update({ display_order: currentProgram.display_order })
        .eq('id', targetProgram.id);

      toast.success('Program order updated');
      loadPrograms();
    } catch (error) {
      console.error('Error reordering program:', error);
      toast.error('Failed to reorder program');
    } finally {
      setLoading(false);
    }
  };

  const saveProgrammingData = async () => {
    if (!selectedProgram) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_programs')
        .update({
          phase_name: programmingData.phaseName,
          phase_dates: programmingData.phaseDates,
          overview_text: programmingData.overviewText,
          sessions: {
            A: programmingData.sessionA,
            B: programmingData.sessionB,
            C: programmingData.sessionC,
            D: programmingData.sessionD,
            E: programmingData.sessionE,
            F: programmingData.sessionF,
            G: programmingData.sessionG,
            H: programmingData.sessionH,
          } as any,
          weekly_schedules: programmingData.weeklySchedules as any,
        })
        .eq('id', selectedProgram.id);

      if (error) throw error;

      // Save to coaching database if requested
      if (saveToCoachingDB.programme) {
        await supabase.from('coaching_programmes').insert({
          title: selectedProgram.program_name,
          description: `${programmingData.phaseName} - ${programmingData.phaseDates}`,
          content: programmingData.overviewText,
          category: 'Player Programming'
        });
      }

      if (saveToCoachingDB.sessions) {
        const sessionsToSave = [];
        for (const [key, session] of Object.entries({
          'A': programmingData.sessionA,
          'B': programmingData.sessionB,
          'C': programmingData.sessionC,
          'D': programmingData.sessionD,
          'E': programmingData.sessionE,
          'F': programmingData.sessionF,
          'G': programmingData.sessionG,
          'H': programmingData.sessionH,
        })) {
          if (session.exercises.length > 0) {
            sessionsToSave.push({
              title: `Session ${key} - ${selectedProgram.program_name}`,
              content: session.exercises.map((ex: Exercise) => 
                `${ex.name}: ${ex.sets} sets x ${ex.repetitions} reps @ ${ex.load}, ${ex.recoveryTime} rest`
              ).join('\n'),
              category: 'Player Programming'
            });
          }
        }
        if (sessionsToSave.length > 0) {
          await supabase.from('coaching_sessions').insert(sessionsToSave);
        }
      }

      if (saveToCoachingDB.exercises) {
        // Get all existing exercises
        const { data: existing } = await supabase
          .from('coaching_exercises')
          .select('title');
        
        const existingTitles = new Set(existing?.map((e: any) => e.title) || []);
        const allExercises = [];

        for (const session of Object.values({
          ...programmingData.sessionA,
          ...programmingData.sessionB,
          ...programmingData.sessionC,
          ...programmingData.sessionD,
          ...programmingData.sessionE,
          ...programmingData.sessionF,
          ...programmingData.sessionG,
          ...programmingData.sessionH,
        })) {
          if (Array.isArray(session)) {
            for (const ex of session as Exercise[]) {
              if (ex.name && !existingTitles.has(ex.name)) {
                allExercises.push({
                  title: ex.name,
                  description: ex.description,
                  content: `Video: ${ex.videoUrl || 'N/A'}`,
                  sets: parseInt(ex.sets) || null,
                  reps: ex.repetitions,
                  rest_time: ex.recoveryTime ? parseInt(ex.recoveryTime.replace(/[^\d]/g, '')) : null,
                  category: 'Player Programming'
                });
                existingTitles.add(ex.name);
              }
            }
          }
        }

        if (allExercises.length > 0) {
          await supabase.from('coaching_exercises').insert(allExercises);
          toast.success(`Added ${allExercises.length} new exercises to coaching database`);
        }
      }

      toast.success('Program saved successfully');
      loadPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Failed to save program');
    } finally {
      setLoading(false);
    }
  };

  const makeCurrentProgram = async (programId: string) => {
    setLoading(true);
    try {
      await supabase
        .from('player_programs')
        .update({ is_current: false })
        .eq('player_id', playerId);

      const { error } = await supabase
        .from('player_programs')
        .update({ is_current: true })
        .eq('id', programId);

      if (error) throw error;

      toast.success('Program set as current');
      loadPrograms();
    } catch (error) {
      console.error('Error setting current program:', error);
      toast.error('Failed to set current program');
    } finally {
      setLoading(false);
    }
  };

  const deleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast.success('Program deleted successfully');
      if (selectedProgram?.id === programId) {
        setSelectedProgram(null);
        setProgrammingData(initialProgrammingData());
      }
      loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProgrammingData, value: any) => {
    setProgrammingData(prev => ({ ...prev, [field]: value }));
  };

  const addExercise = (sessionKey: keyof Pick<ProgrammingData, 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH'>) => {
    const session = programmingData[sessionKey] as SessionData;
    updateField(sessionKey, {
      ...session,
      exercises: [...session.exercises, emptyExercise()]
    });
  };

  const addExerciseFromDatabase = (sessionKey: keyof Pick<ProgrammingData, 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH'>, exercise: Exercise) => {
    const session = programmingData[sessionKey] as SessionData;
    updateField(sessionKey, {
      ...session,
      exercises: [...session.exercises, exercise]
    });
  };

  const removeExercise = (sessionKey: keyof Pick<ProgrammingData, 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH'>, index: number) => {
    const session = programmingData[sessionKey] as SessionData;
    updateField(sessionKey, {
      ...session,
      exercises: session.exercises.filter((_, i) => i !== index)
    });
  };

  const updateExercise = (sessionKey: keyof Pick<ProgrammingData, 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH'>, index: number, field: keyof Exercise, value: string) => {
    const session = programmingData[sessionKey] as SessionData;
    const updatedExercises = [...session.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    updateField(sessionKey, {
      ...session,
      exercises: updatedExercises
    });
  };

  const moveExercise = (sessionKey: keyof Pick<ProgrammingData, 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH'>, index: number, direction: 'up' | 'down') => {
    const session = programmingData[sessionKey] as SessionData;
    const exercises = [...session.exercises];
    
    if (direction === 'up' && index > 0) {
      [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
    } else if (direction === 'down' && index < exercises.length - 1) {
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
    }
    
    updateField(sessionKey, {
      ...session,
      exercises
    });
  };

  const addWeeklySchedule = () => {
    updateField('weeklySchedules', [...programmingData.weeklySchedules, emptyWeeklySchedule()]);
  };

  const removeWeeklySchedule = (index: number) => {
    updateField('weeklySchedules', programmingData.weeklySchedules.filter((_, i) => i !== index));
  };

  const updateWeeklySchedule = (index: number, field: keyof WeeklySchedule, value: string) => {
    const updated = [...programmingData.weeklySchedules];
    updated[index] = { ...updated[index], [field]: value };
    updateField('weeklySchedules', updated);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Programming Management - {playerName}</DialogTitle>
        </DialogHeader>

        {!selectedProgram ? (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Programs</h3>
              <div className="flex gap-2">
                <Button onClick={() => setIsCreatingNew(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Program
                </Button>
                <Button variant="outline" onClick={() => setShowUploadProgram(true)}>
                  <Database className="w-4 h-4 mr-2" />
                  Upload Program
                </Button>
              </div>
            </div>

            {showUploadProgram && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Program Name</Label>
                      <Input
                        placeholder="Program name (e.g., Pre-Season 2025)"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="csv-upload">Upload CSV Program File</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a CSV file and the program structure will be imported automatically
                      </p>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setExcelFile(file);
                          }
                        }}
                        disabled={uploadingExcel}
                      />
                      {excelFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {excelFile.name}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createNewProgram} disabled={loading || uploadingExcel || !newProgramName || !excelFile}>
                        {uploadingExcel ? 'Processing File...' : loading ? 'Uploading...' : 'Upload Program'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowUploadProgram(false);
                        setNewProgramName('');
                        setExcelFile(null);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isCreatingNew && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Program name (e.g., Pre-Season 2025)"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="excel-upload">Upload Excel File (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload an Excel file and AI will automatically extract the program structure for you
                      </p>
                      <Input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setExcelFile(file);
                          }
                        }}
                        disabled={uploadingExcel}
                      />
                      {excelFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {excelFile.name}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createNewProgram} disabled={loading || uploadingExcel}>
                        {uploadingExcel ? 'Processing Excel...' : loading ? 'Creating...' : 'Create'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsCreatingNew(false);
                        setNewProgramName('');
                        setExcelFile(null);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {programs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No programs created yet. Click "New Program" to get started.
                  </CardContent>
                </Card>
              ) : (
                programs.map((program, idx) => (
                  <Card key={program.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveProgram(program.id, 'up')}
                              disabled={idx === 0 || loading}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveProgram(program.id, 'down')}
                              disabled={idx === programs.length - 1 || loading}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{program.program_name}</h4>
                              {program.is_current && (
                                <Badge variant="default" className="gap-1">
                                  <Check className="w-3 h-3" />
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(program.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!program.is_current && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => makeCurrentProgram(program.id)}
                              disabled={loading}
                            >
                              Make Current
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadProgramDetails(program.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProgram(program.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => {
                setSelectedProgram(null);
                setProgrammingData(initialProgrammingData());
              }}>
                &larr; Back to Programs
              </Button>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedProgram.program_name}</span>
                {selectedProgram.is_current && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Phase Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phaseName">Phase Name</Label>
                        <Input
                          id="phaseName"
                          placeholder="e.g., Push-Pull Phase"
                          value={programmingData.phaseName}
                          onChange={(e) => updateField('phaseName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phaseDates">Phase Dates</Label>
                        <Input
                          id="phaseDates"
                          placeholder="e.g., October"
                          value={programmingData.phaseDates}
                          onChange={(e) => updateField('phaseDates', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="overviewText">Overview Text</Label>
                      <Textarea
                        id="overviewText"
                        placeholder="Enter overall programming notes, goals, and structure..."
                        value={programmingData.overviewText}
                        onChange={(e) => updateField('overviewText', e.target.value)}
                        rows={12}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Training Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {sessionLabels.map((session) => (
                          <Button
                            key={session.key}
                            variant={selectedSession === session.key ? "default" : "outline"}
                            onClick={() => setSelectedSession(session.key)}
                          >
                            {session.label}
                          </Button>
                        ))}
                      </div>

                      {selectedSession ? (
                        <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <Label className="text-lg font-semibold">
                              {sessionLabels.find(s => s.key === selectedSession)?.label} Exercises
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setIsExerciseSelectorOpen(true)}
                              >
                                <Database className="w-4 h-4 mr-2" />
                                From Database
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addExercise(selectedSession as any)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Manual
                              </Button>
                            </div>
                          </div>

                          {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="p-2 text-left text-xs font-semibold w-20">Order</th>
                                    <th className="p-2 text-left text-xs font-semibold">Exercise Name</th>
                                    <th className="p-2 text-left text-xs font-semibold">Description</th>
                                    <th className="p-2 text-left text-xs font-semibold w-20">Reps</th>
                                    <th className="p-2 text-left text-xs font-semibold w-16">Sets</th>
                                    <th className="p-2 text-left text-xs font-semibold w-20">Load</th>
                                    <th className="p-2 text-left text-xs font-semibold w-24">Recovery</th>
                                    <th className="p-2 text-left text-xs font-semibold w-24">Video</th>
                                    <th className="p-2 w-12"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.map((exercise, idx) => (
                                    <tr key={idx} className="border-t hover:bg-muted/50">
                                      <td className="p-2">
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => moveExercise(selectedSession as any, idx, 'up')}
                                            disabled={idx === 0}
                                          >
                                            <ChevronUp className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => moveExercise(selectedSession as any, idx, 'down')}
                                            disabled={idx === (programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length - 1}
                                          >
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Exercise name"
                                          value={exercise.name}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'name', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Description"
                                          value={exercise.description}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'description', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Reps"
                                          value={exercise.repetitions}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'repetitions', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Sets"
                                          value={exercise.sets}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'sets', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Load"
                                          value={exercise.load}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'load', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Recovery"
                                          value={exercise.recoveryTime}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'recoveryTime', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Video URL"
                                          value={exercise.videoUrl}
                                          onChange={(e) => updateExercise(selectedSession as any, idx, 'videoUrl', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeExercise(selectedSession as any, idx)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              No exercises added yet. Click "Add Exercise" to get started.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          Select a session to manage exercises
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Weekly Schedule</CardTitle>
                      <Button onClick={addWeeklySchedule} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Week
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {programmingData.weeklySchedules.map((schedule, idx) => (
                      <Card key={idx} className="border-2">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-4 flex-1">
                              <div className="space-y-2">
                                <Label className="text-sm">Week Start Date</Label>
                                <Input
                                  type="date"
                                  value={schedule.week_start_date || ''}
                                  onChange={(e) => updateWeeklySchedule(idx, 'week_start_date', e.target.value)}
                                  className="max-w-xs"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Week Label (optional)</Label>
                                <Input
                                  placeholder="Week 1"
                                  value={schedule.week || ''}
                                  onChange={(e) => updateWeeklySchedule(idx, 'week', e.target.value)}
                                  className="max-w-xs"
                                />
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeWeeklySchedule(idx)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Week
                            </Button>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="grid grid-cols-7 gap-2 min-w-[600px] md:min-w-0">
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                <div key={day} className="space-y-2">
                                  <Label className="text-xs capitalize">{day}</Label>
                                  <Input
                                    placeholder="Activity"
                                    value={schedule[day as keyof WeeklySchedule] as string}
                                    onChange={(e) => updateWeeklySchedule(idx, day as keyof WeeklySchedule, e.target.value)}
                                    className="text-xs"
                                  />
                                  <Select
                                    value={schedule[`${day}Color` as keyof WeeklySchedule] as string}
                                    onValueChange={(value) => updateWeeklySchedule(idx, `${day}Color` as keyof WeeklySchedule, value)}
                                  >
                                    <SelectTrigger className="text-xs">
                                      <SelectValue placeholder="Color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="red">Red</SelectItem>
                                      <SelectItem value="blue">Blue</SelectItem>
                                      <SelectItem value="green">Green</SelectItem>
                                      <SelectItem value="yellow">Yellow</SelectItem>
                                      <SelectItem value="purple">Purple</SelectItem>
                                      <SelectItem value="orange">Orange</SelectItem>
                                      <SelectItem value="gray">Gray</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Weekly Notes</Label>
                            <Textarea
                              placeholder="Notes for this week..."
                              value={schedule.scheduleNotes}
                              onChange={(e) => updateWeeklySchedule(idx, 'scheduleNotes', e.target.value)}
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {programmingData.weeklySchedules.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No weekly schedules added yet. Click "Add Week" to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Testing Protocol</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter testing protocols and benchmarks..."
                      value={programmingData.testing}
                      onChange={(e) => updateField('testing', e.target.value)}
                      rows={10}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Save to Coaching Database:</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-programme"
                      checked={saveToCoachingDB.programme}
                      onCheckedChange={(checked) => 
                        setSaveToCoachingDB(prev => ({ ...prev, programme: checked as boolean }))
                      }
                    />
                    <label htmlFor="save-programme" className="text-sm cursor-pointer">
                      Save as Programme
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-sessions"
                      checked={saveToCoachingDB.sessions}
                      onCheckedChange={(checked) => 
                        setSaveToCoachingDB(prev => ({ ...prev, sessions: checked as boolean }))
                      }
                    />
                    <label htmlFor="save-sessions" className="text-sm cursor-pointer">
                      Save Sessions
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-exercises"
                      checked={saveToCoachingDB.exercises}
                      onCheckedChange={(checked) => 
                        setSaveToCoachingDB(prev => ({ ...prev, exercises: checked as boolean }))
                      }
                    />
                    <label htmlFor="save-exercises" className="text-sm cursor-pointer">
                      Save Exercises (new only)
                    </label>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => {
                setSelectedProgram(null);
                setProgrammingData(initialProgrammingData());
              }}>
                Cancel
              </Button>
              <Button onClick={saveProgrammingData} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <ExerciseDatabaseSelector
      isOpen={isExerciseSelectorOpen}
      onClose={() => setIsExerciseSelectorOpen(false)}
      onSelect={(exercise) => {
        if (selectedSession) {
          addExerciseFromDatabase(selectedSession as any, exercise);
        }
      }}
    />
    </>
  );
};
