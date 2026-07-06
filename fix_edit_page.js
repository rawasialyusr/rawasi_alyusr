const fs = require('fs');
let code = fs.readFileSync('app/journal-errors/edit/id/page.tsx', 'utf8');

// 1. Add state for isAdmin and status
code = code.replace(
    /const \[header, setHeader\] = useState\(\{ entry_date: '', description: '' \}\);/,
    "const [header, setHeader] = useState({ entry_date: '', description: '', status: '' });\n  const [isAdmin, setIsAdmin] = useState(false);"
);

// 2. Fetch isAdmin profile inside useEffect
const fetchDataReplacement = `
        // سحب بيانات المستخدم (هل هو Admin؟)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
           setIsAdmin(profile?.role === 'super_admin' || profile?.role === 'admin');
        }

        // سحب شجرة الحسابات
`;
code = code.replace(/\/\/\s*سحب شجرة الحسابات/, fetchDataReplacement);

// 3. Update setHeader to include status
code = code.replace(
    /setHeader\(\{ entry_date: headerData\.entry_date, description: headerData\.description \|\| '' \}\);/,
    "setHeader({ entry_date: headerData.entry_date, description: headerData.description || '', status: headerData.status });"
);

// 4. Update UI to hide/disable buttons if status === 'معتمد' && !isAdmin
// Button 1: Save Button
code = code.replace(
    /<button onClick=\{handleSave\}.*?>\s*💾 حفظ التعديلات\s*<\/button>/,
    `{!(header.status === 'معتمد' && !isAdmin) ? (
          <button onClick={handleSave} className="btn-main-glass green" disabled={isSaving}>
            {isSaving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
          </button>
        ) : (
          <div style={{ padding: '10px 20px', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontWeight: 'bold' }}>
            🔒 هذا القيد معتمد ولا يمكنك تعديله
          </div>
        )}`
);

// Button 2: Add Line
code = code.replace(
    /<button type="button" className="btn-action btn-add" onClick=\{addLine\}>/,
    `{!(header.status === 'معتمد' && !isAdmin) && <button type="button" className="btn-action btn-add" onClick={addLine}>`
);
code = code.replace(
    /➕ إضافة طرف جديد للقيد<\/button>/,
    `➕ إضافة طرف جديد للقيد</button>}`
);

// Button 3: Remove Line
code = code.replace(
    /<button type="button" className="btn-del" onClick=\{\(\) => removeLine\(index\)\}>🗑️<\/button>/g,
    `{!(header.status === 'معتمد' && !isAdmin) && <button type="button" className="btn-del" onClick={() => removeLine(index)}>🗑️</button>}`
);

// Disable inputs if locked
code = code.replace(/disabled=\{isSaving\}/g, "disabled={isSaving || (header.status === 'معتمد' && !isAdmin)}");

fs.writeFileSync('app/journal-errors/edit/id/page.tsx', code);
console.log('Fixed edit page protection');
