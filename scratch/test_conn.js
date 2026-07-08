const { Client } = require('pg');

async function run() {
    const connectionString = 'postgresql://postgres.ggzuaaivrrcuowwemobt:Mooya12345!@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("Dropping old constraint...");
        await client.query(`ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;`);
        
        console.log("Adding new constraint...");
        await client.query(`ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
        CHECK (status IN ('مسودة', 'جاري التنفيذ', 'مكتمل', 'موقوف', 'جاري التسليم', 'مفوتر', 'تم التحصيل'));`);

        console.log("Constraint updated successfully!");
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await client.end();
    }
}
run();
