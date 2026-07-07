const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check lines for a specific posted receipt
    const { data, error } = await supabase
        .from('material_receipt_lines')
        .select('*, receipt:material_receipts(id, is_posted, status)')
        .limit(5);
        
    console.log("Material Receipt Lines for Posted Receipts:", data);
}
run();
