const fs = require('fs');
const postgres = require('postgres');

async function run() {
    const envPath = '.env.local';
    let dbUrl;
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        dbUrl = env.match(/DATABASE_URL=(.*)/)?.[1]?.trim();
        // Fallback to supabase url if needed, but DATABASE_URL is standard
    }
    
    if (!dbUrl) {
        console.error('No DATABASE_URL found');
        return;
    }

    const sql = postgres(dbUrl, { ssl: 'require' });
    const query = fs.readFileSync('fix_msg_trigger.sql', 'utf8');

    try {
        await sql.unsafe(query);
        console.log('Trigger fixed successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.end();
    }
}
run();
