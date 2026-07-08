const { Client } = require('pg');

async function run() {
    const connectionString = 'postgres://postgres:Mooya12345!@[2406:da14:271:9921:2695:a664:1c98:311e]:5432/postgres';
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query(`SELECT 1`);
        console.log("SUCCESS:", res.rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        await client.end();
    }
}
run();
