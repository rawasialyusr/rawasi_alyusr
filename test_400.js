const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('projects').select('id,name');
    console.log("Projects Error:", JSON.stringify(error, null, 2));

    const { data: mData, error: mError } = await supabase
        .from('manual_journals')
        .select(`*,debit_account:accounts!manual_journals_debit_account_id_fkey(name),credit_account:accounts!manual_journals_credit_account_id_fkey(name),partner:partners(name),project:projects(name)`);
    console.log("Manual Journals Error:", JSON.stringify(mError, null, 2));
}
check();
