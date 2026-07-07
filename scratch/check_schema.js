const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: receipt } = await supabase.from('material_receipts').select('*').limit(1);
    console.log("RECEIPTS SCHEMA:", Object.keys(receipt?.[0] || {}));

    const { data: issue } = await supabase.from('material_issues').select('*').limit(1);
    console.log("ISSUES SCHEMA:", Object.keys(issue?.[0] || {}));
}
run();
