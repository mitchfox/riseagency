import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PlayerProgrammingNotesProps {
  playerId: string;
}

export const PlayerProgrammingNotes = ({ playerId }: PlayerProgrammingNotesProps) => {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [playerId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("programming_notes")
      .eq("id", playerId)
      .single();

    if (!error && data) {
      setNotes((data as any).programming_notes);
    }
    setLoading(false);
  };

  // Don't render anything if there are no notes
  if (!loading && !notes) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Notes from Your Coach
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner size="md" className="py-4" />
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
