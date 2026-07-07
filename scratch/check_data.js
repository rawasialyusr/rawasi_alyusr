const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: items } = await supabase.from('material_items').select('*').limit(2);
    console.log("ITEMS:", items);

    const { data: lines } = await supabase.from('material_receipt_lines').select('*').limit(2);
    console.log("LINES:", lines);
}
run();
