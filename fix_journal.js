const fs = require('fs');

let code = fs.readFileSync('app/journal/journal_logic.ts', 'utf8');

const protectionLogic = `
            const selectedLines = journalMaster.filter(l => selectedIds.includes(String(l.line_id)));
            // استخراج رؤوس القيود الفريدة (Unique Header IDs)
            const headerIds = [...new Set(selectedLines.map(l => l.header_id))];
            
            // 🛡️ حماية القيود المعتمدة (الباب العاشر)
            const { data: { session } } = await supabase.auth.getSession();
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session?.user?.id).single();
            const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
            
            if (!isAdmin) {
                const hasApproved = selectedLines.some(l => l.header_status === 'معتمد');
                if (hasApproved) {
                    throw new Error('عفواً، لا تملك صلاحية تعديل أو حذف القيود المعتمدة والمرحلة.');
                }
            }
`;

code = code.replace(
    /const selectedLines = journalMaster\.filter\(l => selectedIds\.includes\(String\(l\.line_id\)\)\);\s*\/\/\s*استخراج رؤوس القيود الفريدة.*?const headerIds = \[\.\.\.new Set\(selectedLines\.map\(l => l\.header_id\)\)\];/s,
    protectionLogic
);

fs.writeFileSync('app/journal/journal_logic.ts', code);
console.log('Fixed journal_logic.ts protection');
