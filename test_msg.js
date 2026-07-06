const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
    const envPath = '.env.local';
    let url, key;
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    }
    const supabase = createClient(url, key);

    // Get any two users
    const { data: users } = await supabase.from('profiles').select('id').limit(2);
    if (users && users.length === 2) {
        console.log('Sending message from', users[0].id, 'to', users[1].id);
        const { error } = await supabase.from('messages').insert({
            sender_id: users[0].id,
            receiver_id: users[1].id,
            content: 'Testing realtime'
        });
        if (error) {
            console.error('Error inserting message:', error);
        } else {
            console.log('Message inserted successfully.');
        }
    }
}
check();
