import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Upload } from "lucide-react";

export const ImportExercisesButton = () => {
  const [importing, setImporting] = useState(false);

  const parseRecoveryTime = (recoveryStr: string): number | null => {
    if (!recoveryStr || recoveryStr === "'-" || recoveryStr === 'Full' || recoveryStr === '') return null;
    const match = recoveryStr.match(/(\d+)s/);
    return match ? parseInt(match[1]) : null;
  };

  const parseSets = (setsStr: string): number | null => {
    if (!setsStr || setsStr === 'x') return null;
    const num = parseInt(setsStr);
    return isNaN(num) ? null : null;
  };

  const parseJSONArray = (str: string): string[] => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str.replace(/'/g, '"').replace(/\\/g, ''));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      // Fetch the CSV file
      const response = await fetch('/exercise-import-2025.csv');
      const csvContent = await response.text();
      
      // Clear existing exercises
      await supabase.from('coaching_exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      const lines = csvContent.split('\n');
      const exercises = [];
      let totalParsed = 0;

      // Parse CSV (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const columns = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              columns.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          columns.push(current);

          if (columns.length < 10) continue;

          const title = columns[2]?.trim();
          if (!title) continue;

          const description = columns[3]?.trim();
          const reps = columns[4]?.trim();
          const sets = parseSets(columns[5]?.trim());
          const restTime = parseRecoveryTime(columns[7]?.trim());
          const typeArray = parseJSONArray(columns[8]);
          const muscleArray = parseJSONArray(columns[9]);

          const category = typeArray[0] || null;
          const tags = [...typeArray, ...muscleArray].filter(t => t);

          exercises.push({
            title,
            description: description || null,
            content: null,
            reps: reps || null,
            sets,
            rest_time: restTime,
            category,
            tags: tags.length > 0 ? tags : null
          });

          totalParsed++;

          // Insert in batches of 100
          if (exercises.length === 100) {
            await supabase.from('coaching_exercises').insert(exercises);
            toast.success(`Imported ${totalParsed} exercises...`);
            exercises.length = 0;
          }
        } catch (error) {
          console.error(`Error parsing line ${i}:`, error);
        }
      }

      // Insert remaining exercises
      if (exercises.length > 0) {
        await supabase.from('coaching_exercises').insert(exercises);
      }

      const { count } = await supabase
        .from('coaching_exercises')
        .select('*', { count: 'exact', head: true });

      toast.success(`Successfully imported ${count} exercises!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import exercises');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Button
      onClick={handleImport}
      disabled={importing}
      className="gap-2"
    >
      <Upload className="h-4 w-4" />
      {importing ? 'Importing...' : 'Import All Exercises from CSV'}
    </Button>
  );
};
