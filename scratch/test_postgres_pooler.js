const postgres = require('postgres');

async function run() {
    const sql = postgres('postgres://postgres:Mooya12345!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres', {
        ssl: {
            rejectUnauthorized: false,
            servername: 'db.ggzuaaivrrcuowwemobt.supabase.co'
        }
    });

    try {
        console.log("Connecting with postgresjs and SNI...");
        const res = await sql`SELECT 1 as result`;
        console.log("SUCCESS:", res);
        
        console.log("Dropping old constraint...");
        await sql`ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;`;
        
        console.log("Adding new constraint...");
        await sql`ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
        CHECK (status IN ('مسودة', 'جاري التنفيذ', 'مكتمل', 'موقوف', 'جاري التسليم', 'مفوتر', 'تم التحصيل'));`;

        console.log("Constraint updated successfully!");
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await sql.end();
    }
}
run();
