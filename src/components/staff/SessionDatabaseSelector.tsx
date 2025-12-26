import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Exercise {
  name: string;
  description: string;
  repetitions: string;
  sets: string;
  load: string;
  recoveryTime: string;
  videoUrl: string;
}

interface CoachingSession {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  exercises: unknown;
  tags: string[] | null;
}

interface SessionDatabaseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (exercises: Exercise[], mode: 'replace' | 'append') => void;
}

export const SessionDatabaseSelector = ({ isOpen, onClose, onImport }: SessionDatabaseSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      setSelectedSession(null);
      setImportMode('append');
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sessions.filter(
        (session) =>
          session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchTerm, sessions]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .order('title');

      if (error) throw error;
      setSessions(data || []);
      setFilteredSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseExercises = (session: CoachingSession): Exercise[] => {
    const exercises = session.exercises;
    if (!exercises || !Array.isArray(exercises)) {
      return [];
    }

    return exercises.map((ex: any) => ({
      name: ex.name || ex.title || '',
      description: ex.description || '',
      repetitions: ex.repetitions || ex.reps || '',
      sets: ex.sets?.toString() || '',
      load: ex.load || '',
      recoveryTime: ex.recoveryTime || (ex.rest_time ? `${ex.rest_time}s` : ''),
      videoUrl: ex.videoUrl || ex.video_url || ''
    }));
  };

  const handleImport = () => {
    if (!selectedSession) return;
    
    const exercises = parseExercises(selectedSession);
    onImport(exercises, importMode);
    setSearchTerm("");
    setSelectedSession(null);
    onClose();
  };

  const getExerciseCount = (session: CoachingSession): number => {
    const exercises = session.exercises;
    if (!exercises || !Array.isArray(exercises)) return 0;
    return exercises.length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Import Session from Coaching Database
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No sessions found matching your search' : 'No sessions in database'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSession?.id === session.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-semibold">{session.title}</h4>
                        {session.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap mt-2">
                          {session.category && (
                            <Badge variant="secondary" className="text-xs">
                              {session.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getExerciseCount(session)} exercises
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedSession && (
            <div className="border-t pt-4 space-y-3">
              <Label className="font-medium">Import Mode</Label>
              <RadioGroup 
                value={importMode} 
                onValueChange={(v) => setImportMode(v as 'replace' | 'append')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="append" />
                  <Label htmlFor="append" className="cursor-pointer">
                    Append to existing exercises
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="cursor-pointer">
                    Replace all exercises
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                This will import {getExerciseCount(selectedSession)} exercise(s) from "{selectedSession.title}"
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedSession}
            >
              Import Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
