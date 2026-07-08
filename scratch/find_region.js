const { Client } = require('pg');

const regions = [
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'sa-east-1',
    'ca-central-1',
    'ap-south-1'
];

async function run() {
    for (const region of regions) {
        console.log(`Trying region: ${region}...`);
        const connectionString = `postgresql://postgres.ggzuaaivrrcuowwemobt:Mooya12345!@aws-0-${region}.pooler.supabase.com:6543/postgres`;
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        try {
            await client.connect();
            console.log(`✅ SUCCESS on ${region}!`);
            
            console.log("Dropping old constraint...");
            await client.query(`ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;`);
            
            console.log("Adding new constraint...");
            await client.query(`ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
            CHECK (status IN ('مسودة', 'جاري التنفيذ', 'مكتمل', 'موقوف', 'جاري التسليم', 'مفوتر', 'تم التحصيل'));`);

            console.log("Constraint updated successfully!");
            await client.end();
            return; // exit loop on success
        } catch (e) {
            console.log(`❌ Failed on ${region}:`, e.message);
        } finally {
            try { await client.end(); } catch (err) {}
        }
    }
}
run();
