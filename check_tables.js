const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

  supabase.rpc('exec_sql', {
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%alloc%';"
  }).then(({data, error}) => {
    if (error) console.log('ERROR allocations:', error.message);
    else console.log('DATA allocations:', data);
    
    supabase.rpc('exec_sql', {
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%over%';"
    }).then(({data: d2, error: e2}) => {
        if (e2) console.log('ERROR over:', e2.message);
        else console.log('DATA over:', d2);
    });
  });
}
