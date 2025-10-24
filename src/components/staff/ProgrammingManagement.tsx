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
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  scheduleNotes: string;
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
}

interface ProgrammingData {
  // Overview/Phase Info
  phaseName: string;
  phaseDates: string;
  phaseImageUrl: string;
  playerImageUrl: string;
  overviewText: string;
  
  // Sessions
  sessionA: SessionData;
  sessionB: SessionData;
  sessionC: SessionData;
  sessionD: SessionData;
  sessionE: SessionData;
  sessionF: SessionData;
  sessionG: SessionData;
  sessionH: SessionData;
  
  // Weekly Schedule
  weeklySchedules: WeeklySchedule[];
  
  // Testing
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
  scheduleNotes: ''
});

const emptyWeeklySchedule = (): WeeklySchedule => ({
  week: '',
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '',
  mondayColor: '', tuesdayColor: '', wednesdayColor: '', thursdayColor: '', fridayColor: '', saturdayColor: '', sundayColor: ''
});

export const ProgrammingManagement = ({ isOpen, onClose, playerId, playerName }: ProgrammingManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [programmingData, setProgrammingData] = useState<ProgrammingData>({
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

  useEffect(() => {
    if (isOpen && playerId) {
      loadProgrammingData();
    }
  }, [isOpen, playerId]);

  const loadProgrammingData = async () => {
    try {
      const { data: player, error } = await supabase
        .from('players')
        .select('bio')
        .eq('id', playerId)
        .single();

      if (error) throw error;

      if (player?.bio) {
        try {
          const bioData = JSON.parse(player.bio);
          if (bioData.programming) {
            setProgrammingData({
              phaseName: bioData.programming.phaseName || '',
              phaseDates: bioData.programming.phaseDates || '',
              phaseImageUrl: bioData.programming.phaseImageUrl || '',
              playerImageUrl: bioData.programming.playerImageUrl || '',
              overviewText: bioData.programming.overviewText || '',
              sessionA: bioData.programming.sessionA || emptySession(),
              sessionB: bioData.programming.sessionB || emptySession(),
              sessionC: bioData.programming.sessionC || emptySession(),
              sessionD: bioData.programming.sessionD || emptySession(),
              sessionE: bioData.programming.sessionE || emptySession(),
              sessionF: bioData.programming.sessionF || emptySession(),
              sessionG: bioData.programming.sessionG || emptySession(),
              sessionH: bioData.programming.sessionH || emptySession(),
              weeklySchedules: bioData.programming.weeklySchedules || [],
              testing: bioData.programming.testing || '',
            });
          }
        } catch (e) {
          console.log("Bio is not JSON format");
        }
      }
    } catch (error) {
      console.error("Error loading programming data:", error);
      toast.error("Failed to load programming data");
    }
  };

  const saveProgrammingData = async () => {
    try {
      setLoading(true);

      // Get current player data
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('bio')
        .eq('id', playerId)
        .single();

      if (fetchError) throw fetchError;

      // Parse existing bio or create new structure
      let bioData: any = {};
      if (player?.bio) {
        try {
          bioData = JSON.parse(player.bio);
        } catch {
          bioData = { bio: player.bio };
        }
      }

      // Update programming section
      bioData.programming = programmingData;

      // Save back to database
      const { error: updateError } = await supabase
        .from('players')
        .update({ bio: JSON.stringify(bioData) })
        .eq('id', playerId);

      if (updateError) throw updateError;

      toast.success("Programming data saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving programming data:", error);
      toast.error("Failed to save programming data");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProgrammingData, value: any) => {
    setProgrammingData(prev => ({
      ...prev,
      [field]: value
    }));
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Physical Programming - {playerName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
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
                  <p className="text-xs text-muted-foreground">
                    Include long-term focus, phase goals, technical objectives, and general guidelines.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
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
                      <div className="flex justify-between items-center">
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

                      {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.map((exercise, idx) => (
                        <Card key={idx} className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-sm">Exercise {idx + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExercise(selectedSession as any, idx)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Exercise Name</Label>
                              <Input
                                placeholder="e.g., Bird Dog with Lateral Reach"
                                value={exercise.name}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Repetitions</Label>
                              <Input
                                placeholder="e.g., 16 (8 each side)"
                                value={exercise.repetitions}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'repetitions', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Exercise Description</Label>
                            <Textarea
                              placeholder="Detailed description of how to perform the exercise..."
                              value={exercise.description}
                              onChange={(e) => updateExercise(selectedSession as any, idx, 'description', e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Sets</Label>
                              <Input
                                placeholder="e.g., 3"
                                value={exercise.sets}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'sets', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Load</Label>
                              <Input
                                placeholder="e.g., 20kg"
                                value={exercise.load}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'load', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Recovery Time</Label>
                              <Input
                                placeholder="e.g., 60s"
                                value={exercise.recoveryTime}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'recoveryTime', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Video URL</Label>
                              <Input
                                placeholder="Video link"
                                value={exercise.videoUrl}
                                onChange={(e) => updateExercise(selectedSession as any, idx, 'videoUrl', e.target.value)}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}

                      {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                          No exercises added yet. Click "Add Exercise" to get started.
                        </div>
                      )}

                      <div className="space-y-2 pt-4">
                        <Label htmlFor="scheduleNotes">Schedule Details / Notes</Label>
                        <Textarea
                          id="scheduleNotes"
                          placeholder="e.g., Daily Prehab can be performed on all non-match or gym days..."
                          value={(programmingData[selectedSession as keyof ProgrammingData] as SessionData).scheduleNotes}
                          onChange={(e) => updateField(selectedSession as keyof ProgrammingData, {
                            ...(programmingData[selectedSession as keyof ProgrammingData] as SessionData),
                            scheduleNotes: e.target.value
                          })}
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Select a session above to edit its content
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Weekly Training Schedule</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addWeeklySchedule}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Week
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {programmingData.weeklySchedules.map((schedule, idx) => (
                  <Card key={idx} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold">Week {idx + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWeeklySchedule(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Week Number/Name</Label>
                      <Input
                        placeholder="e.g., Week 1"
                        value={schedule.week}
                        onChange={(e) => updateWeeklySchedule(idx, 'week', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <div key={day} className="space-y-2">
                          <Label className="text-xs capitalize">{day.slice(0, 3)}</Label>
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
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="red">Red</SelectItem>
                              <SelectItem value="orange">Orange</SelectItem>
                              <SelectItem value="yellow">Yellow</SelectItem>
                              <SelectItem value="green">Green</SelectItem>
                              <SelectItem value="blue">Blue</SelectItem>
                              <SelectItem value="purple">Purple</SelectItem>
                              <SelectItem value="gray">Gray</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}

                {programmingData.weeklySchedules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No weekly schedules added yet. Click "Add Week" to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Physical Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="testing">Testing Protocols & Results</Label>
                  <Textarea
                    id="testing"
                    placeholder="Enter testing protocols, benchmarks, and results (speed tests, strength tests, etc.)..."
                    value={programmingData.testing}
                    onChange={(e) => updateField('testing', e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include sprint times, jump heights, strength metrics, and any other physical assessment data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={saveProgrammingData} disabled={loading}>
            {loading ? "Saving..." : "Save Programming"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
