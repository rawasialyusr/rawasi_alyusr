const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    // Attempt to insert and see if we get error about read_at
    console.log("Checking DB...");
    const { data, error } = await supabase.from('messages').select('id, read_at').limit(1);
    console.log("SELECT messages:", error ? error.message : "Success");
    
    // Check if we can trigger a realtime event? We can't easily check publication from client.
}
check();
