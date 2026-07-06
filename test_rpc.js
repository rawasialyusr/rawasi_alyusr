const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
    const envPath = '.env.local';
    let url, key;
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    }
    const supabase = createClient(url, key);

    const query = fs.readFileSync('fix_msg_trigger.sql', 'utf8');

    const { data, error } = await supabase.rpc('execute_sql', { query });
    if (error) {
        console.error('Error executing SQL via RPC:', error);
    } else {
        console.log('Successfully executed via execute_sql');
    }
}
check();
