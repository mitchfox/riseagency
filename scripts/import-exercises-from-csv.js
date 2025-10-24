import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseRecoveryTime(recoveryStr) {
  if (!recoveryStr || recoveryStr === "'-" || recoveryStr === 'Full' || recoveryStr === '') return null;
  const match = recoveryStr.match(/(\d+)s/);
  return match ? parseInt(match[1]) : null;
}

function parseSets(setsStr) {
  if (!setsStr || setsStr === 'x' || setsStr === '') return null;
  const num = parseInt(setsStr);
  return isNaN(num) ? null : num;
}

function parseJSONArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function importExercises() {
  console.log('Reading CSV file...');
  const csvPath = path.join(__dirname, '..', 'public', 'exercise-import-2025.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  console.log(`Found ${lines.length} lines in CSV`);
  
  // Clear existing exercises
  console.log('Clearing existing exercises...');
  const { error: deleteError } = await supabase
    .from('coaching_exercises')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Error clearing exercises:', deleteError);
  }
  
  let exercises = [];
  let totalParsed = 0;
  let skippedLines = 0;
  
  // Skip header line (line 1)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skippedLines++;
      continue;
    }
    
    try {
      // Parse CSV with proper quote handling
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
      
      // Need at least 10 columns (up to Muscle Group)
      if (columns.length < 10) {
        skippedLines++;
        continue;
      }
      
      const title = columns[2].trim();
      if (!title) {
        skippedLines++;
        continue;
      }
      
      const description = columns[3].trim();
      const reps = columns[4].trim();
      const sets = parseSets(columns[5].trim());
      const load = columns[6].trim();
      const restTime = parseRecoveryTime(columns[7].trim());
      const typeArray = parseJSONArray(columns[8]);
      const muscleArray = parseJSONArray(columns[9]);
      
      const category = typeArray[0] || null;
      const tags = [...typeArray, ...muscleArray];
      
      exercises.push({
        title,
        description: description || null,
        content: null,
        reps: reps || null,
        sets,
        load: load || null,
        rest_time: restTime,
        category,
        tags: tags.length > 0 ? tags : null
      });
      
      totalParsed++;
      
      // Insert in batches of 100
      if (exercises.length === 100) {
        console.log(`Inserting batch of ${exercises.length} exercises...`);
        const { error } = await supabase
          .from('coaching_exercises')
          .insert(exercises);
        
        if (error) {
          console.error('Error inserting batch:', error);
        } else {
          console.log(`Successfully inserted batch`);
        }
        exercises = [];
      }
    } catch (error) {
      console.error(`Error parsing line ${i}:`, error.message);
      skippedLines++;
    }
  }
  
  // Insert remaining exercises
  if (exercises.length > 0) {
    console.log(`Inserting final batch of ${exercises.length} exercises...`);
    const { error } = await supabase
      .from('coaching_exercises')
      .insert(exercises);
    
    if (error) {
      console.error('Error inserting final batch:', error);
    } else {
      console.log(`Successfully inserted final batch`);
    }
  }
  
  // Get final count
  const { count } = await supabase
    .from('coaching_exercises')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nImport complete!`);
  console.log(`Total lines in CSV: ${lines.length - 1} (excluding header)`);
  console.log(`Successfully parsed: ${totalParsed}`);
  console.log(`Skipped lines: ${skippedLines}`);
  console.log(`Total exercises in database: ${count}`);
}

importExercises().catch(console.error);
