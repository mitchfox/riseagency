// Node.js script to import exercises via the edge function
const fs = require('fs');
const path = require('path');

async function runImport() {
  const csvPath = path.join(__dirname, '..', 'public', 'tmp-exercise-import.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const formData = new FormData();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'exercises.csv', { type: 'text/csv' });
  formData.append('file', file);

  const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/import-exercises`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  console.log('Import result:', result);
}

runImport().catch(console.error);
