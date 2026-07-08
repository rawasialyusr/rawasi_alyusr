const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].trim() : '';
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name LIKE '%job_orders%status%';" });
    if (error) {
        console.error("RPC failed, maybe we don't have execute_sql:", error);
    } else {
        console.log("Check constraints:", data);
    }
}

checkSchema();
