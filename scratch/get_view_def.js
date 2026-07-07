const { Client } = require('pg');

const connectionString = 'postgres://postgres:Mooya12345!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query(`SELECT view_definition FROM information_schema.views WHERE table_name = 'vw_inventory_balances_v2'`);
        console.log("VIEW DEF:", res.rows[0]?.view_definition);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await client.end();
    }
}
run();
