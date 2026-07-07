const { Client } = require('pg');
const connectionString = 'postgres://postgres:Mooya12345!@db.ggzuaaivrrcuowwemobt.supabase.co:5432/postgres';
const client = new Client({ connectionString });

async function run() {
    await client.connect();
    
    // Get table details and triggers
    const sql = `
SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_statement AS definition
FROM information_schema.triggers
WHERE event_object_table IN ('materials', 'material_receipt_items', 'material_receipts');
    `;
    
    try {
        const { rows } = await client.query(sql);
        console.log("Triggers:", JSON.stringify(rows, null, 2));
    } catch(err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
