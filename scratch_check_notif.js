const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('notifications').select('*').limit(1);
    console.log("Error:", error);
    if (data) {
        if (data.length > 0) {
            console.log("Keys:", Object.keys(data[0]));
        } else {
            console.log("Table exists but empty. Need schema.");
            // Insert dummy to get column errors
            const { error: insErr } = await supabase.from('notifications').insert([{ title: 'test' }]);
            console.log("Insert Error:", insErr);
        }
    }
}
check();
