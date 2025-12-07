import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  name: string;
  position: string;
  club: string | null;
}

interface AgentNotesManagementProps {
  players: Player[];
  selectedPlayer: string;
}

export const AgentNotesManagement = ({ players, selectedPlayer }: AgentNotesManagementProps) => {
  const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerNotes();
  }, []);

  const fetchPlayerNotes = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, agent_notes");

    if (!error && data) {
      const notes: Record<string, string> = {};
      data.forEach(p => {
        notes[p.id] = p.agent_notes || "";
      });
      setPlayerNotes(notes);
    }
    setLoading(false);
  };

  const handleNoteChange = (playerId: string, value: string) => {
    setPlayerNotes(prev => ({
      ...prev,
      [playerId]: value
    }));
  };

  const savePlayerNote = async (playerId: string) => {
    setSaving(playerId);
    
    const { error } = await supabase
      .from("players")
      .update({
        agent_notes: playerNotes[playerId] || ""
      })
      .eq("id", playerId);

    if (error) {
      toast.error("Failed to save note");
    } else {
      toast.success("Agent note saved");
    }
    setSaving(null);
  };

  const filteredPlayers = selectedPlayer === "all" 
    ? players 
    : players.filter(p => p.id === selectedPlayer);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Agent Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPlayers.map(player => (
              <div key={player.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.position} • {player.club || "No Club"}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => savePlayerNote(player.id)}
                    disabled={saving === player.id}
                  >
                    {saving === player.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
                <Textarea
                  placeholder="Add notes for this player that they can see in their portal..."
                  value={playerNotes[player.id] || ""}
                  onChange={(e) => handleNoteChange(player.id, e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This note will be visible to the player in their Transfer Hub portal.
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
