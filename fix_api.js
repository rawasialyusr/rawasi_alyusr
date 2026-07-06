const fs = require('fs');
const file = 'app/api/admin/users/route.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);`,
`const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);`
);

content = content.replace(/supabaseAdmin\./g, 'getSupabaseAdmin().');

fs.writeFileSync(file, content);
console.log('Fixed API route');
