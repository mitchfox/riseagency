import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";

interface PlayerAgentNotesProps {
  playerId: string;
}

export const PlayerAgentNotes = ({ playerId }: PlayerAgentNotesProps) => {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [playerId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("agent_notes")
      .eq("id", playerId)
      .single();

    if (!error && data) {
      setNotes(data.agent_notes);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes from Your Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : notes ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{notes}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This message is from your agent. Contact them directly if you have questions.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No notes yet. Your agent will update you here with important information.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
