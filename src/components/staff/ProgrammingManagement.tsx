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
import { Plus, Trash2, Check, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  week: string;
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
  phaseImageUrl: string;
  playerImageUrl: string;
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
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '',
  mondayColor: '', tuesdayColor: '', wednesdayColor: '', thursdayColor: '', fridayColor: '', saturdayColor: '', sundayColor: '',
  scheduleNotes: ''
});

const initialProgrammingData = (): ProgrammingData => ({
  phaseName: '',
  phaseDates: '',
  phaseImageUrl: '',
  playerImageUrl: '',
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");

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
        phaseImageUrl: data.phase_image_url || '',
        playerImageUrl: data.player_image_url || '',
        overviewText: data.overview_text || '',
        sessionA: sessions.sessionA || emptySession(),
        sessionB: sessions.sessionB || emptySession(),
        sessionC: sessions.sessionC || emptySession(),
        sessionD: sessions.sessionD || emptySession(),
        sessionE: sessions.sessionE || emptySession(),
        sessionF: sessions.sessionF || emptySession(),
        sessionG: sessions.sessionG || emptySession(),
        sessionH: sessions.sessionH || emptySession(),
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
      const { error } = await supabase
        .from('player_programs')
        .insert({
          player_id: playerId,
          program_name: newProgramName,
          is_current: programs.length === 0,
          sessions: {},
          weekly_schedules: []
        });

      if (error) throw error;

      toast.success('Program created successfully');
      setNewProgramName('');
      setIsCreatingNew(false);
      loadPrograms();
    } catch (error) {
      console.error('Error creating program:', error);
      toast.error('Failed to create program');
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
          phase_image_url: programmingData.phaseImageUrl,
          player_image_url: programmingData.playerImageUrl,
          overview_text: programmingData.overviewText,
          sessions: {
            sessionA: programmingData.sessionA,
            sessionB: programmingData.sessionB,
            sessionC: programmingData.sessionC,
            sessionD: programmingData.sessionD,
            sessionE: programmingData.sessionE,
            sessionF: programmingData.sessionF,
            sessionG: programmingData.sessionG,
            sessionH: programmingData.sessionH,
          } as any,
          weekly_schedules: programmingData.weeklySchedules as any,
        })
        .eq('id', selectedProgram.id);

      if (error) throw error;

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

  const handleImageUpload = async (file: File, fieldName: 'phaseImageUrl' | 'playerImageUrl') => {
    try {
      setUploadingImage(true);
      
      const fileName = `${playerId}_${fieldName}_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('analysis-files')
        .upload(`programming/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`programming/${fileName}`);
      
      updateField(fieldName, publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programming Management - {playerName}</DialogTitle>
        </DialogHeader>

        {!selectedProgram ? (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Programs</h3>
              <Button onClick={() => setIsCreatingNew(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Program
              </Button>
            </div>

            {isCreatingNew && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Program name (e.g., Pre-Season 2025)"
                      value={newProgramName}
                      onChange={(e) => setNewProgramName(e.target.value)}
                    />
                    <Button onClick={createNewProgram} disabled={loading}>
                      Create
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsCreatingNew(false);
                      setNewProgramName('');
                    }}>
                      Cancel
                    </Button>
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
                programs.map((program) => (
                  <Card key={program.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phaseImage">Phase Image</Label>
                        <Input
                          id="phaseImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'phaseImageUrl');
                          }}
                          disabled={uploadingImage}
                        />
                        {programmingData.phaseImageUrl && (
                          <div className="mt-2">
                            <img 
                              src={programmingData.phaseImageUrl} 
                              alt="Phase" 
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="playerImage">Player Image</Label>
                        <Input
                          id="playerImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'playerImageUrl');
                          }}
                          disabled={uploadingImage}
                        />
                        {programmingData.playerImageUrl && (
                          <div className="mt-2">
                            <img 
                              src={programmingData.playerImageUrl} 
                              alt="Player" 
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
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
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addExercise(selectedSession as any)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Exercise
                            </Button>
                          </div>

                          {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted">
                                  <tr>
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
                            <Input
                              placeholder="Week (e.g., Week 1)"
                              value={schedule.week}
                              onChange={(e) => updateWeeklySchedule(idx, 'week', e.target.value)}
                              className="max-w-xs"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeWeeklySchedule(idx)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Week
                            </Button>
                          </div>

                          <div className="grid grid-cols-7 gap-2">
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
  );
};
