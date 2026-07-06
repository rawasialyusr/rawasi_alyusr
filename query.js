const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'sync_boq_from_logs_on_save';
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
