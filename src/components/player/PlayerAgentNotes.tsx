import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
          <LoadingSpinner size="md" className="py-8" />
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
