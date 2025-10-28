import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerFixturesProps {
  playerId: string;
  playerName: string;
  onCreateAnalysis?: (fixtureId: string) => void;
  triggerOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  competition: string | null;
  venue: string | null;
}

interface PlayerFixture {
  id: string;
  fixture_id: string;
  minutes_played: number | null;
  fixtures: Fixture;
}

export const PlayerFixtures = ({ playerId, playerName, onCreateAnalysis, triggerOpen, onDialogOpenChange }: PlayerFixturesProps) => {
  const [playerFixtures, setPlayerFixtures] = useState<PlayerFixture[]>([]);
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState<number | null>(null);
  const [editingPlayerFixture, setEditingPlayerFixture] = useState<PlayerFixture | null>(null);
  const [manualFixture, setManualFixture] = useState({
    home_team: "",
    away_team: "",
    home_score: null as number | null,
    away_score: null as number | null,
    match_date: "",
    competition: "",
    venue: "",
  });
  const [aiFixtures, setAiFixtures] = useState<any[]>([]);
  const [fetchingAiFixtures, setFetchingAiFixtures] = useState(false);
  const [selectedAiFixtures, setSelectedAiFixtures] = useState<Set<number>>(new Set());
  const [aiRawResponse, setAiRawResponse] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  useEffect(() => {
    if (triggerOpen) {
      handleOpenDialog();
      onDialogOpenChange?.(false);
    }
  }, [triggerOpen]);

  useEffect(() => {
    fetchPlayerFixtures();
    fetchAllFixtures();
  }, [playerId]);

  const fetchPlayerFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("player_fixtures")
        .select(`
          *,
          fixtures(*)
        `)
        .eq("player_id", playerId)
        .order("fixtures(match_date)", { ascending: false });

      if (error) throw error;
      setPlayerFixtures((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching player fixtures:", error);
      toast.error("Failed to fetch fixtures");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: false });

      if (error) throw error;
      setAllFixtures(data || []);
    } catch (error: any) {
      console.error("Error fetching fixtures:", error);
    }
  };

  const handleOpenDialog = (playerFixture?: PlayerFixture) => {
    if (playerFixture) {
      setEditingPlayerFixture(playerFixture);
      setSelectedFixtureId(playerFixture.fixture_id);
      setMinutesPlayed(playerFixture.minutes_played);
    } else {
      setEditingPlayerFixture(null);
      setSelectedFixtureId("");
      setMinutesPlayed(null);
      setManualFixture({
        home_team: "",
        away_team: "",
        home_score: null,
        away_score: null,
        match_date: "",
        competition: "",
        venue: "",
      });
      setAiFixtures([]);
      setSelectedAiFixtures(new Set());
    }
    setDialogOpen(true);
  };

  const fetchAiFixtures = async (teamName: string) => {
    setFetchingAiFixtures(true);
    setAiRawResponse("");
    try {
      // Get player details to find team name
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("bio")
        .eq("id", playerId)
        .single();

      if (playerError) throw playerError;

      let currentClub = teamName;
      if (playerData?.bio) {
        try {
          const bioData = JSON.parse(playerData.bio);
          currentClub = bioData.currentClub || teamName;
        } catch (e) {
          // Use provided team name
        }
      }

      console.log("Fetching fixtures for:", currentClub);

      // Call edge function to fetch fixtures
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-team-fixtures`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ teamName: currentClub }),
        }
      );

      const data = await response.json();
      console.log("Received data:", data);
      
      // Store raw response for debugging
      if (data.rawResponse) {
        setAiRawResponse(data.rawResponse);
      }
      
      setAiFixtures(data.fixtures || []);
      
      if (data.fixtures?.length === 0) {
        toast.info(
          data.rawResponse 
            ? "No fixtures parsed. Check the 'AI Response' tab to see what was found." 
            : "No fixtures generated for this team"
        );
      } else {
        toast.success(`Generated ${data.fixtures.length} fixtures for ${currentClub}`);
      }
    } catch (error: any) {
      console.error("Error fetching AI fixtures:", error);
      const errorMsg = error.message || "Unknown error occurred";
      toast.error(`Error: ${errorMsg}. Check console for details.`);
      setAiRawResponse(`Error: ${errorMsg}`);
    } finally {
      setFetchingAiFixtures(false);
    }
  };

  const handleSaveManualFixture = async () => {
    try {
      // First create the fixture
      const { data: newFixture, error: fixtureError } = await supabase
        .from("fixtures")
        .insert([manualFixture])
        .select()
        .single();

      if (fixtureError) throw fixtureError;

      // Then link it to the player
      const { error: linkError } = await supabase
        .from("player_fixtures")
        .insert([
          {
            player_id: playerId,
            fixture_id: newFixture.id,
            minutes_played: minutesPlayed,
          },
        ]);

      if (linkError) throw linkError;

      toast.success("Fixture created and added successfully");
      handleCloseDialog();
      fetchPlayerFixtures();
      fetchAllFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixture");
      console.error(error);
    }
  };

  const handleSaveAiFixtures = async () => {
    try {
      const fixturesToAdd = Array.from(selectedAiFixtures).map(
        (index) => aiFixtures[index]
      );

      for (const fixture of fixturesToAdd) {
        // Create fixture in database
        const { data: newFixture, error: fixtureError } = await supabase
          .from("fixtures")
          .insert([
            {
              home_team: fixture.home_team,
              away_team: fixture.away_team,
              match_date: fixture.match_date,
              competition: fixture.competition,
              venue: fixture.venue,
            },
          ])
          .select()
          .single();

        if (fixtureError) throw fixtureError;

        // Link to player
        await supabase.from("player_fixtures").insert([
          {
            player_id: playerId,
            fixture_id: newFixture.id,
          },
        ]);
      }

      toast.success(`Added ${fixturesToAdd.length} fixtures successfully`);
      handleCloseDialog();
      fetchPlayerFixtures();
      fetchAllFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixtures");
      console.error(error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlayerFixture(null);
    setSelectedFixtureId("");
    setMinutesPlayed(null);
  };

  const handleSave = async () => {
    try {
      if (editingPlayerFixture) {
        const { error } = await supabase
          .from("player_fixtures")
          .update({
            fixture_id: selectedFixtureId,
            minutes_played: minutesPlayed,
          })
          .eq("id", editingPlayerFixture.id);

        if (error) throw error;
        toast.success("Fixture updated successfully");
      } else {
        const { error } = await supabase.from("player_fixtures").insert([
          {
            player_id: playerId,
            fixture_id: selectedFixtureId,
            minutes_played: minutesPlayed,
          },
        ]);

        if (error) throw error;
        toast.success("Fixture added successfully");
      }

      handleCloseDialog();
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixture");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this fixture?")) return;

    try {
      const { error } = await supabase
        .from("player_fixtures")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Fixture removed successfully");
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to remove fixture");
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading fixtures...</div>;
  }

  return (
    <div className="space-y-4">
      <button 
        data-trigger-add-fixture 
        onClick={() => handleOpenDialog()} 
        style={{ display: 'none' }}
      />
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlayerFixture ? "Edit" : "Add"} Fixture
            </DialogTitle>
          </DialogHeader>

          {editingPlayerFixture ? (
            <div className="space-y-4">
              <div>
                <Label>Fixture</Label>
                <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fixture" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFixtures.map((fixture) => (
                      <SelectItem key={fixture.id} value={fixture.id}>
                        {fixture.home_team} vs {fixture.away_team} -{" "}
                        {new Date(fixture.match_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Minutes Played (Optional)</Label>
                <Input
                  type="number"
                  value={minutesPlayed || ""}
                  onChange={(e) =>
                    setMinutesPlayed(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Leave blank if not yet played"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => {
                  if (editingPlayerFixture) {
                    handleDelete(editingPlayerFixture.id);
                  }
                }}>
                  Delete
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="ai">AI Fetch</TabsTrigger>
                <TabsTrigger value="ai-response">AI Response</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Home Team</Label>
                    <Input
                      value={manualFixture.home_team}
                      onChange={(e) =>
                        setManualFixture({ ...manualFixture, home_team: e.target.value })
                      }
                      placeholder="Home Team"
                    />
                  </div>
                  <div>
                    <Label>Away Team</Label>
                    <Input
                      value={manualFixture.away_team}
                      onChange={(e) =>
                        setManualFixture({ ...manualFixture, away_team: e.target.value })
                      }
                      placeholder="Away Team"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Home Score (Optional)</Label>
                    <Input
                      type="number"
                      value={manualFixture.home_score ?? ""}
                      onChange={(e) =>
                        setManualFixture({
                          ...manualFixture,
                          home_score: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Away Score (Optional)</Label>
                    <Input
                      type="number"
                      value={manualFixture.away_score ?? ""}
                      onChange={(e) =>
                        setManualFixture({
                          ...manualFixture,
                          away_score: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Match Date</Label>
                  <Input
                    type="date"
                    value={manualFixture.match_date}
                    onChange={(e) =>
                      setManualFixture({ ...manualFixture, match_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Minutes Played (Optional)</Label>
                  <Input
                    type="number"
                    value={minutesPlayed || ""}
                    onChange={(e) =>
                      setMinutesPlayed(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Leave blank if not yet played"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveManualFixture}>Create & Add Fixture</Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an image/screenshot of the fixture list and AI will extract the matches
                  </p>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setUploadedImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                      id="fixture-image-upload"
                    />
                    <label htmlFor="fixture-image-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-muted-foreground">
                          Click to upload fixture list image
                        </div>
                        <div className="text-xs text-muted-foreground">
                          PNG, JPG, or screenshot
                        </div>
                      </div>
                    </label>
                  </div>

                  {uploadedImage && (
                    <>
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded fixture list" 
                          className="max-h-64 w-full object-contain border rounded"
                        />
                      </div>
                      
                      <Button
                        onClick={async () => {
                          setProcessingImage(true);
                          setAiFixtures([]);
                          setAiRawResponse("");
                          
                          try {
                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-fixtures-from-image`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                                },
                                body: JSON.stringify({ 
                                  image: uploadedImage,
                                  teamName: playerName
                                }),
                              }
                            );

                            const data = await response.json();
                            console.log("Received data from image processing:", data);
                            
                            if (data.rawResponse) {
                              setAiRawResponse(data.rawResponse);
                            }
                            
                            if (data.fixtures && data.fixtures.length > 0) {
                              setAiFixtures(data.fixtures);
                              toast.success(`Extracted ${data.fixtures.length} fixtures from image`);
                            } else {
                              toast.info("No fixtures found. Check the 'AI Response' tab to see what was extracted.");
                            }
                          } catch (error: any) {
                            console.error("Error processing image:", error);
                            toast.error(`Error: ${error.message || "Failed to process image"}`);
                            setAiRawResponse(`Error: ${error.message}`);
                          } finally {
                            setProcessingImage(false);
                          }
                        }}
                        disabled={processingImage}
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {processingImage ? "Processing Image..." : "Extract Fixtures from Image"}
                      </Button>
                    </>
                  )}

                  {aiFixtures.length > 0 && (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {aiFixtures.map((fixture, index) => (
                          <Card
                            key={index}
                            className={`cursor-pointer transition-colors ${
                              selectedAiFixtures.has(index)
                                ? "border-primary bg-primary/5"
                                : ""
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedAiFixtures);
                              if (newSelected.has(index)) {
                                newSelected.delete(index);
                              } else {
                                newSelected.add(index);
                              }
                              setSelectedAiFixtures(newSelected);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {fixture.home_team} vs {fixture.away_team}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(fixture.match_date).toLocaleDateString()} •{" "}
                                    {fixture.competition}
                                  </div>
                                </div>
                                {selectedAiFixtures.has(index) && (
                                  <div className="text-primary">✓</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveAiFixtures}
                          disabled={selectedAiFixtures.size === 0}
                        >
                          Add Selected ({selectedAiFixtures.size})
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Fetch upcoming fixtures for {playerName}'s team using AI
                  </p>
                  <Button
                    onClick={() => fetchAiFixtures(playerName)}
                    disabled={fetchingAiFixtures}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {fetchingAiFixtures ? "Fetching..." : "Fetch Upcoming Fixtures"}
                  </Button>

                  {aiFixtures.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {aiFixtures.map((fixture, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-colors ${
                            selectedAiFixtures.has(index)
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                          onClick={() => {
                            const newSelected = new Set(selectedAiFixtures);
                            if (newSelected.has(index)) {
                              newSelected.delete(index);
                            } else {
                              newSelected.add(index);
                            }
                            setSelectedAiFixtures(newSelected);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {fixture.home_team} vs {fixture.away_team}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(fixture.match_date).toLocaleDateString()} •{" "}
                                  {fixture.competition}
                                </div>
                              </div>
                              {selectedAiFixtures.has(index) && (
                                <div className="text-primary">✓</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {aiFixtures.length > 0 && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveAiFixtures}
                        disabled={selectedAiFixtures.size === 0}
                      >
                        Add Selected ({selectedAiFixtures.size})
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai-response" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Raw AI response for debugging (shows what the AI generated)
                  </p>
                  {aiRawResponse ? (
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-xs whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-muted p-4 rounded">
                          {aiRawResponse}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No AI response yet. Use the "AI Fetch" tab to generate fixtures.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {playerFixtures.slice(0, displayCount).map((pf) => (
          <div 
            key={pf.id} 
            className="flex items-center gap-3 border rounded-lg p-3 hover:border-primary transition-colors"
          >
            <span className="text-sm text-muted-foreground min-w-[80px]">
              {new Date(pf.fixtures.match_date).toLocaleDateString('en-GB')}
            </span>
            
            <div className="flex flex-col min-w-[150px]">
              <span className="text-sm font-medium">
                {pf.fixtures.home_team} vs {pf.fixtures.away_team}
              </span>
              {pf.fixtures.competition && (
                <span className="text-xs text-muted-foreground">{pf.fixtures.competition}</span>
              )}
              {(pf.fixtures.home_score !== null && pf.fixtures.away_score !== null) && (
                <span className="text-xs text-muted-foreground">
                  {pf.fixtures.home_score} - {pf.fixtures.away_score}
                </span>
              )}
            </div>
            
            {pf.minutes_played && (
              <span className="text-sm text-muted-foreground">
                {pf.minutes_played} min
              </span>
            )}
            
            <div className="ml-auto flex gap-2">
              {onCreateAnalysis && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreateAnalysis(pf.fixture_id)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Analysis
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDialog(pf)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ))}
        {playerFixtures.length > displayCount && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDisplayCount(prev => prev + 10)}
          >
            Show More
          </Button>
        )}
      </div>
    </div>
  );
};