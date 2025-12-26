import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Exercise {
  id: string;
  title: string;
  description: string;
  sets: number | null;
  reps: string | null;
  rest_time: number | null;
  category: string | null;
  tags: string[] | null;
}

interface ExerciseDatabaseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: {
    name: string;
    description: string;
    repetitions: string;
    sets: string;
    load: string;
    recoveryTime: string;
    videoUrl: string;
  }) => void;
}

export const ExerciseDatabaseSelector = ({ isOpen, onClose, onSelect }: ExerciseDatabaseSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExercises();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = exercises.filter(
        (ex) =>
          ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ex.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ex.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredExercises(filtered);
    } else {
      setFilteredExercises(exercises);
    }
  }, [searchTerm, exercises]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coaching_exercises')
        .select('*')
        .order('title');

      if (error) throw error;
      setExercises(data || []);
      setFilteredExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    onSelect({
      name: exercise.title,
      description: exercise.description || '',
      repetitions: exercise.reps || '',
      sets: exercise.sets?.toString() || '',
      load: '',
      recoveryTime: exercise.rest_time ? `${exercise.rest_time}s` : '',
      videoUrl: ''
    });
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Exercise from Database</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading exercises...</div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No exercises found matching your search' : 'No exercises in database'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectExercise(exercise)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-semibold">{exercise.title}</h4>
                        {exercise.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {exercise.description}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap mt-2">
                          {exercise.category && (
                            <Badge variant="secondary" className="text-xs">
                              {exercise.category}
                            </Badge>
                          )}
                          {exercise.sets && (
                            <Badge variant="outline" className="text-xs">
                              {exercise.sets} sets
                            </Badge>
                          )}
                          {exercise.reps && (
                            <Badge variant="outline" className="text-xs">
                              {exercise.reps} reps
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
