import { supabase } from "@/integrations/supabase/client";
import * as fs from 'fs';

async function importExercises() {
  const csvContent = fs.readFileSync('tmp-exercise-import.csv', 'utf-8');
  const lines = csvContent.split('\n');
  const exercises = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handling quoted fields)
    const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 9) continue;
    
    const fields = matches.map(m => m.replace(/^"|"$/g, '').trim());
    
    const videoUrl = fields[0] || null;
    const exerciseName = fields[2];
    const description = fields[3] || null;
    const reps = fields[4] || null;
    const setsStr = fields[5] || null;
    const sets = setsStr && setsStr !== 'x' ? parseInt(setsStr) : null;
    const load = fields[6] || null;
    const restTime = fields[7] || null;
    const typeStr = fields[8] || '[]';
    const muscleGroupStr = fields[9] || '[]';
    
    // Parse JSON arrays from string
    let types: string[] = [];
    let muscleGroups: string[] = [];
    
    try {
      const parsed = JSON.parse(typeStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
      types = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      types = [];
    }
    
    try {
      const parsed = JSON.parse(muscleGroupStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
      muscleGroups = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      muscleGroups = [];
    }
    
    // Determine category based on types
    let category = types.length > 0 ? types[0] : 'General';
    
    // Convert rest time to seconds
    let restSeconds = null;
    if (restTime && restTime !== "'-") {
      const match = restTime.match(/(\d+)s/);
      if (match) {
        restSeconds = parseInt(match[1]);
      }
    }
    
    exercises.push({
      title: exerciseName,
      description: description,
      content: `**Muscle Groups:** ${muscleGroups.join(', ') || 'N/A'}\n\n**Types:** ${types.join(', ') || 'N/A'}`,
      sets: sets,
      reps: reps || null,
      rest_time: restSeconds,
      category: category,
      tags: [...types, ...muscleGroups],
      attachments: videoUrl ? [{ type: 'video', url: videoUrl }] : []
    });
  }

  console.log(`Parsed ${exercises.length} exercises`);

  // Check for existing exercises
  const { data: existing } = await supabase
    .from('coaching_exercises')
    .select('title');
  
  const existingTitles = new Set(existing?.map(e => e.title) || []);
  const newExercises = exercises.filter(e => !existingTitles.has(e.title));
  
  console.log(`Found ${existingTitles.size} existing, importing ${newExercises.length} new`);

  // Insert in batches of 100
  for (let i = 0; i < newExercises.length; i += 100) {
    const batch = newExercises.slice(i, i + 100);
    const { error } = await supabase
      .from('coaching_exercises')
      .insert(batch);
    
    if (error) throw error;
    console.log(`Imported ${Math.min(i + 100, newExercises.length)}/${newExercises.length}`);
  }
  
  console.log('Import complete!');
}

importExercises();
