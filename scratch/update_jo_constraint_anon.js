const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
    const sql = `
        ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;
        ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
        CHECK (status IN ('مسودة', 'جاري التنفيذ', 'مكتمل', 'موقوف', 'جاري التسليم', 'مفوتر', 'تم التحصيل'));
    `;
    
    console.log("Executing SQL using ANON_KEY...");
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
        console.error("RPC failed:", error);
    } else {
        console.log("Success:", data);
    }
}

runSQL();
