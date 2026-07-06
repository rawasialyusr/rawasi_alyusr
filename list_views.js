const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL="(.*)"/);

if (dbUrlMatch) {
  const client = new Client({
    connectionString: dbUrlMatch[1]
  });

  client.connect().then(() => {
    return client.query("SELECT table_name FROM information_schema.views WHERE table_schema = 'public';");
  }).then(res => {
    console.log(res.rows.map(r => r.table_name));
    client.end();
  }).catch(e => {
    console.error(e);
    client.end();
  });
} else {
  console.log("No DATABASE_URL found.");
}
