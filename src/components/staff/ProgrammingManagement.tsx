import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProgrammingManagementProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

interface ProgrammingData {
  overview: string;
  sessionA: string;
  sessionB: string;
  sessionC: string;
  sessionD: string;
  sessionE: string;
  sessionF: string;
  sessionG: string;
  sessionH: string;
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

export const ProgrammingManagement = ({ isOpen, onClose, playerId, playerName }: ProgrammingManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [programmingData, setProgrammingData] = useState<ProgrammingData>({
    overview: '',
    sessionA: '',
    sessionB: '',
    sessionC: '',
    sessionD: '',
    sessionE: '',
    sessionF: '',
    sessionG: '',
    sessionH: '',
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
              overview: bioData.programming.overview || '',
              sessionA: bioData.programming.sessionA || '',
              sessionB: bioData.programming.sessionB || '',
              sessionC: bioData.programming.sessionC || '',
              sessionD: bioData.programming.sessionD || '',
              sessionE: bioData.programming.sessionE || '',
              sessionF: bioData.programming.sessionF || '',
              sessionG: bioData.programming.sessionG || '',
              sessionH: bioData.programming.sessionH || '',
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

  const updateField = (field: keyof ProgrammingData, value: string) => {
    setProgrammingData(prev => ({
      ...prev,
      [field]: value
    }));
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Programming Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="overview">Overview Content</Label>
                  <Textarea
                    id="overview"
                    placeholder="Enter overall programming notes, goals, and structure..."
                    value={programmingData.overview}
                    onChange={(e) => updateField('overview', e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include weekly schedules, strength & conditioning workouts, recovery protocols, nutrition guidelines, and injury prevention exercises.
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
                    <div className="space-y-2 pt-4">
                      <Label htmlFor={selectedSession}>
                        {sessionLabels.find(s => s.key === selectedSession)?.label} Content
                      </Label>
                      <Textarea
                        id={selectedSession}
                        placeholder={`Enter exercises, sets, reps, and notes for ${sessionLabels.find(s => s.key === selectedSession)?.label}...`}
                        value={programmingData[selectedSession as keyof ProgrammingData]}
                        onChange={(e) => updateField(selectedSession as keyof ProgrammingData, e.target.value)}
                        rows={15}
                        className="font-mono text-sm"
                      />
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
