require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tripId = '00000000-0000-0000-0000-000000000000'; // dummy uuid
  const { data: legacyTrip, error } = await supabase
    .from('group_trips')
    .select('gender_preference')
    .eq('id', tripId)
    .single();

  console.log('legacyTrip:', legacyTrip);
  console.log('error:', error);
  console.log('truthy check:', legacyTrip ? 'truthy' : 'falsy');
}
run();
