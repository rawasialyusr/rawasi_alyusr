const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const [, url] = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const [, key] = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const { createClient } = require('@supabase/supabase-js');
const s = createClient(url, key);

async function run() {
    const { data, error } = await s.rpc('execute_sql', { sql: "SELECT prosrc FROM pg_proc WHERE proname = 'unpost_universal_bulk'" });
    console.log(data || error);
}
run();
