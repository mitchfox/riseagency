const fs = require('fs');

const csvContent = fs.readFileSync('public/tmp-exercise-import.csv', 'utf-8');
const lines = csvContent.split('\n');

let sqlBatches = [];
let currentBatch = [];
let exerciseCount = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
  if (!matches || matches.length < 9) continue;
  
  const fields = matches.map(m => m.replace(/^"|"$/g, '').replace(/'/g, "''").trim());
  
  const exerciseName = fields[2];
  if (!exerciseName) continue;
  
  const description = fields[3] || '';
  const reps = fields[4] || null;
  const setsStr = fields[5] || null;
  const sets = (setsStr && setsStr !== 'x' && !isNaN(parseInt(setsStr))) ? parseInt(setsStr) : null;
  const restTime = fields[7] || null;
  const typeStr = fields[8] || '[]';
  const muscleGroupStr = fields[9] || '[]';
  
  let types = [];
  let muscleGroups = [];
  
  try {
    types = JSON.parse(typeStr.replace(/\[""/, '["').replace(/""\]/, '"]')).filter(t => t);
  } catch (e) {}
  
  try {
    muscleGroups = JSON.parse(muscleGroupStr.replace(/\[""/, '["').replace(/""\]/, '"]')).filter(m => m);
  } catch (e) {}
  
  const category = types.length > 0 ? types[0] : 'General';
  
  let restSeconds = null;
  if (restTime && restTime !== "'-") {
    const match = restTime.match(/(\d+)s/);
    if (match) restSeconds = parseInt(match[1]);
  }
  
  const content = `**Muscle Groups:** ${muscleGroups.join(', ') || 'N/A'}\\n\\n**Types:** ${types.join(', ') || 'N/A'}`;
  const tagsArray = [...types, ...muscleGroups].filter(t => t).map(t => `'${t}'`).join(',');
  
  currentBatch.push(`('${exerciseName}', '${description.substring(0, 500)}', '${content}', ${sets}, ${reps ? `'${reps}'` : 'NULL'}, ${restSeconds}, '${category}', ARRAY[${tagsArray}])`);
  
  exerciseCount++;
  
  if (currentBatch.length >= 50) {
    sqlBatches.push(`INSERT INTO coaching_exercises (title, description, content, sets, reps, rest_time, category, tags) VALUES\n${currentBatch.join(',\n')};\n\n`);
    currentBatch = [];
  }
}

if (currentBatch.length > 0) {
  sqlBatches.push(`INSERT INTO coaching_exercises (title, description, content, sets, reps, rest_time, category, tags) VALUES\n${currentBatch.join(',\n')};\n\n`);
}

fs.writeFileSync('scripts/insert-exercises.sql', sqlBatches.join(''));
console.log(`Generated SQL for ${exerciseCount} exercises in ${sqlBatches.length} batches`);
