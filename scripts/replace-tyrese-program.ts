// Script to replace Tyrese's November program
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function replaceProgram() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'user-uploads', 'JL_Tyrese_Omotoye_SPS_1.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const programId = '7630aaf2-a106-4b47-bb1d-daa0e6967315';
    const playerId = 'b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e';
    
    console.log('Replacing program...');
    const { data, error } = await supabase.functions.invoke('replace-program', {
      body: { programId, csvContent, playerId }
    });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Success!', data);
  } catch (error) {
    console.error('Failed:', error);
  }
}

replaceProgram();
