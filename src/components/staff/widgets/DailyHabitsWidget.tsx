import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

const DEFAULT_HABITS: Habit[] = [
  { id: '1', name: 'Review player updates', completed: false },
  { id: '2', name: 'Check emails', completed: false },
  { id: '3', name: 'Team sync call', completed: false },
  { id: '4', name: 'Log activities', completed: false },
];

export const DailyHabitsWidget = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");

  useEffect(() => {
    // Load from localStorage
    const today = new Date().toDateString();
    const storageKey = `daily_habits_${today}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      setHabits(JSON.parse(saved));
    } else {
      // Reset habits for new day
      setHabits(DEFAULT_HABITS.map(h => ({ ...h, completed: false })));
    }
  }, []);

  const saveHabits = (newHabits: Habit[]) => {
    const today = new Date().toDateString();
    const storageKey = `daily_habits_${today}`;
    localStorage.setItem(storageKey, JSON.stringify(newHabits));
    setHabits(newHabits);
  };

  const toggleHabit = (id: string) => {
    const updated = habits.map(h => 
      h.id === id ? { ...h, completed: !h.completed } : h
    );
    saveHabits(updated);
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    const updated = [...habits, { id: Date.now().toString(), name: newHabit, completed: false }];
    saveHabits(updated);
    setNewHabit("");
  };

  const completedCount = habits.filter(h => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{completedCount}/{habits.length} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Habits list */}
      <div className="flex-1 overflow-auto space-y-1">
        {habits.map(habit => (
          <label 
            key={habit.id} 
            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
              habit.completed ? 'bg-emerald-500/10' : 'hover:bg-accent/50'
            }`}
          >
            <Checkbox
              checked={habit.completed}
              onCheckedChange={() => toggleHabit(habit.id)}
              className="h-3 w-3"
            />
            <span className={`text-xs ${habit.completed ? 'line-through text-muted-foreground' : ''}`}>
              {habit.name}
            </span>
          </label>
        ))}
      </div>

      {/* Add new habit */}
      <div className="flex gap-1 pt-1">
        <input
          type="text"
          placeholder="Add habit..."
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addHabit()}
          className="flex-1 h-6 px-2 text-[10px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" className="h-6 w-6 p-0" onClick={addHabit} disabled={!newHabit.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
