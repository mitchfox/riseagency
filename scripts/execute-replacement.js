// Execute the program replacement immediately
const fs = require('fs');
const path = require('path');

async function executeReplacement() {
  const csvPath = path.join(__dirname, '..', 'public', 'tyrese-program.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/replace-program`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      programId: '7630aaf2-a106-4b47-bb1d-daa0e6967315',
      csvContent: csvContent,
      playerId: 'b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e'
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ SUCCESS: Program replaced!');
    console.log(result);
  } else {
    console.error('❌ ERROR:', result);
  }
}

executeReplacement().catch(console.error);
