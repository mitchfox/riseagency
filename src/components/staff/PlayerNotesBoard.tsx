import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BlurTextarea } from "@/components/staff/BlurTextarea";
import { Plus, Trash2, StickyNote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PlayerNotesBoardProps {
  playerKey: string;
  playerName?: string | null;
  source?: string | null;
  sourceId?: string | null;
  className?: string;
  compact?: boolean;
  readOnly?: boolean;
}

interface Note {
  id: string;
  content: string;
  color: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

const COLORS: { key: string; bg: string; ring: string }[] = [
  { key: "yellow", bg: "bg-amber-200/95 text-amber-950", ring: "ring-amber-400" },
  { key: "pink", bg: "bg-pink-200/95 text-pink-950", ring: "ring-pink-400" },
  { key: "blue", bg: "bg-sky-200/95 text-sky-950", ring: "ring-sky-400" },
  { key: "green", bg: "bg-emerald-200/95 text-emerald-950", ring: "ring-emerald-400" },
  { key: "purple", bg: "bg-violet-200/95 text-violet-950", ring: "ring-violet-400" },
];

const colorClasses = (key: string) => COLORS.find(c => c.key === key) || COLORS[0];

export const PlayerNotesBoard = ({
  playerKey,
  playerName,
  source,
  sourceId,
  className,
  compact,
  readOnly,
}: PlayerNotesBoardProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string>("yellow");

  useEffect(() => {
    if (!playerKey) return;
    fetchNotes();
  }, [playerKey]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("player_database_notes")
      .select("id, content, color, created_by_name, created_at, updated_at")
      .eq("player_key", playerKey)
      .order("created_at", { ascending: false });
    if (!error && data) setNotes(data as Note[]);
    setLoading(false);
  };

  const addNote = async () => {
    if (!draft.trim()) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const created_by_name =
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || null;

    const { error } = await supabase.from("player_database_notes").insert({
      player_key: playerKey,
      player_name: playerName || null,
      source: source || null,
      source_id: sourceId || null,
      content: draft.trim(),
      color: draftColor,
      created_by: user?.id || null,
      created_by_name,
    });
    setAdding(false);
    if (error) {
      toast.error("Could not add note");
      return;
    }
    setDraft("");
    fetchNotes();
  };

  const updateNote = async (id: string, content: string) => {
    const { error } = await supabase
      .from("player_database_notes")
      .update({ content })
      .eq("id", id);
    if (error) toast.error("Could not save note");
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("player_database_notes").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete note");
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <span>Notes</span>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
      </div>

      {!readOnly && (
        <div className="rounded-md border border-border/50 bg-muted/20 p-2 mb-3">
          <BlurTextarea
            value={draft}
            onCommit={setDraft}
            placeholder="Quick note: anything you've noticed about this player…"
            rows={compact ? 2 : 3}
            className="resize-none bg-background/60 border-border/40 text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setDraftColor(c.key)}
                  className={`h-5 w-5 rounded-full ${c.bg.split(" ")[0]} ring-offset-2 ring-offset-background transition-all ${
                    draftColor === c.key ? `ring-2 ${c.ring}` : "ring-0 hover:ring-1 ring-border"
                  }`}
                  aria-label={`${c.key} note`}
                />
              ))}
            </div>
            <Button size="sm" onClick={addNote} disabled={adding || !draft.trim()}>
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Add note
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-md">
          No notes yet. Jot down anything you've spotted about this player.
        </div>
      ) : (
        <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {notes.map(note => {
            const c = colorClasses(note.color);
            return (
              <div
                key={note.id}
                className={`relative rounded-md p-3 shadow-sm ${c.bg} group`}
                style={{ transform: "rotate(-0.3deg)" }}
              >
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {readOnly ? (
                  <p className="text-sm whitespace-pre-wrap leading-snug pr-4">{note.content}</p>
                ) : (
                  <Textarea
                    defaultValue={note.content}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val && val !== note.content) updateNote(note.id, val);
                    }}
                    rows={Math.min(6, Math.max(2, Math.ceil(note.content.length / 40)))}
                    className="resize-none bg-transparent border-0 p-0 text-sm leading-snug focus-visible:ring-0 focus-visible:ring-offset-0 pr-4"
                  />
                )}
                <div className="text-[10px] mt-2 opacity-70 flex items-center justify-between">
                  <span>{note.created_by_name || "Staff"}</span>
                  <span>{format(new Date(note.created_at), "d MMM yyyy")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};