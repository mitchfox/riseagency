import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Lightbulb } from "lucide-react";

interface Note {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

const COLORS = ['bg-amber-100', 'bg-blue-100', 'bg-green-100', 'bg-pink-100', 'bg-purple-100'];

export const IdeasNotesWidget = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('ideas_notes');
    if (saved) {
      setNotes(JSON.parse(saved));
    }
  }, []);

  const saveNotes = (newNotes: Note[]) => {
    localStorage.setItem('ideas_notes', JSON.stringify(newNotes));
    setNotes(newNotes);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const updated = [
      { id: Date.now().toString(), content: newNote, color: randomColor, createdAt: new Date().toISOString() },
      ...notes
    ];
    saveNotes(updated);
    setNewNote("");
  };

  const deleteNote = (noteId: string) => {
    const updated = notes.filter(note => note.id !== noteId);
    saveNotes(updated);
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Add note */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Quick idea..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addNote()}
          className="flex-1 h-6 px-2 text-[10px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" className="h-6 w-6 p-0" onClick={addNote} disabled={!newNote.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto space-y-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Lightbulb className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-[10px]">Capture your ideas here</p>
          </div>
        ) : (
          notes.slice(0, 6).map(note => (
            <div
              key={note.id}
              className={`flex items-start gap-1 p-1.5 rounded ${note.color} group`}
            >
              <span className="flex-1 text-[10px] text-gray-700 line-clamp-2">{note.content}</span>
              <button 
                onClick={() => deleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0"
              >
                <X className="h-3 w-3 text-gray-500 hover:text-destructive" />
              </button>
            </div>
          ))
        )}
        {notes.length > 6 && (
          <div className="text-[10px] text-muted-foreground text-center">
            +{notes.length - 6} more notes
          </div>
        )}
      </div>
    </div>
  );
};
