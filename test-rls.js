require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("=== Testing Supabase Connection & RLS ===");
  
  // 1. Create a test user
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error("Auth Error:", authError.message);
    return;
  }
  
  const user = authData.user;
  console.log(`Created test user: ${user.id}`);
  
  // 2. Create a trip
  const tripData = {
    user_id: user.id,
    destination: "Test City",
    start_date: "2026-05-01",
    end_date: "2026-05-10",
    budget: "Budget ($)",
    description: "Testing RLS",
    trip_type: "duo",
    gender_preference: "any",
    max_members: 2
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('trips')
    .insert(tripData)
    .select();
    
  if (insertError) {
    console.error("Insert Error:", insertError.message);
    return;
  }
  
  const tripId = insertData[0].id;
  console.log(`Created trip: ${tripId}`);
  
  // 3. Test Update
  const { data: updateData, error: updateError } = await supabase
    .from('trips')
    .update({ destination: "Updated City" })
    .eq('id', tripId)
    .eq('user_id', user.id)
    .select();
    
  if (updateError || !updateData || updateData.length === 0) {
    console.error("Update failed. Error:", updateError?.message, "Data:", updateData);
  } else {
    console.log("Update successful!", updateData[0].destination);
  }
  
  // 4. Test Delete
  const { data: deleteData, error: deleteError } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('user_id', user.id)
    .select();
    
  if (deleteError || !deleteData || deleteData.length === 0) {
    console.error("Delete failed. Error:", deleteError?.message, "Data:", deleteData);
  } else {
    console.log("Delete successful!");
  }
}

test();
