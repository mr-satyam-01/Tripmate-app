require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Updating gender values in trips...");
  await supabase.from('trips').update({ gender_preference: 'female_only' }).eq('gender_preference', 'women_only');
  await supabase.from('trips').update({ gender_preference: 'male_only' }).eq('gender_preference', 'men_only');
  
  console.log("Updating gender values in group_trips...");
  await supabase.from('group_trips').update({ gender_preference: 'female_only' }).eq('gender_preference', 'women_only');
  await supabase.from('group_trips').update({ gender_preference: 'male_only' }).eq('gender_preference', 'men_only');
  
  console.log("Done");
}

test();
