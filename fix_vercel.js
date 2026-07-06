const fs = require('fs');

const empFile = 'app/employees/page.tsx';
let empContent = fs.readFileSync(empFile, 'utf8');

empContent = empContent.replace(
`               <SecureAction module="employees" action="create">
            <SecureAction module="employees" action="edit">
            <SecureAction module="employees" action="delete">
            <button onClick={() => setIsSidebarPinned(false)} style={{ background: 'transparent', border: 'none', color: THEME.accent, cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            
            <button onClick={logic.handleAddNew} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'white', color: THEME.primary, fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '20px' }}>➕ إضافة كادر جديد</button>
        </SecureAction>
            <input placeholder="🔍 بحث سريع..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', border: 'none', outline: 'none', marginBottom: '20px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length!==1} style={{ padding: '12px', borderRadius: '10px', background: THEME.accent, color: 'white', border: 'none', cursor: logic.selectedIds.length===1 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length===1 ? 1:0.4 }}>✏️ تعديل بيانات السجل</button>
        </SecureAction>
               <button onClick={logic.handleDelete} disabled={logic.selectedIds.length===0} style={{ padding: '12px', borderRadius: '10px', background: THEME.ruby, color: 'white', border: 'none', cursor: logic.selectedIds.length>0 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0 ? 1:0.4 }}>🗑️ طي قيد / حذف</button>
        </SecureAction>`,

`               <button onClick={() => setIsSidebarPinned(false)} style={{ background: 'transparent', border: 'none', color: THEME.accent, cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            
            <SecureAction module="employees" action="create">
               <button onClick={logic.handleAddNew} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'white', color: THEME.primary, fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '20px' }}>➕ إضافة كادر جديد</button>
            </SecureAction>
            <input placeholder="🔍 بحث سريع..." value={logic.globalSearch} onChange={e => logic.setGlobalSearch(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', border: 'none', outline: 'none', marginBottom: '20px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <SecureAction module="employees" action="edit">
                  <button onClick={logic.handleEditSelected} disabled={logic.selectedIds.length!==1} style={{ padding: '12px', borderRadius: '10px', background: THEME.accent, color: 'white', border: 'none', cursor: logic.selectedIds.length===1 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length===1 ? 1:0.4 }}>✏️ تعديل بيانات السجل</button>
               </SecureAction>
               <SecureAction module="employees" action="delete">
                  <button onClick={logic.handleDelete} disabled={logic.selectedIds.length===0} style={{ padding: '12px', borderRadius: '10px', background: THEME.ruby, color: 'white', border: 'none', cursor: logic.selectedIds.length>0 ? 'pointer':'not-allowed', fontWeight: 900, opacity: logic.selectedIds.length>0 ? 1:0.4 }}>🗑️ طي قيد / حذف</button>
               </SecureAction>`
);
fs.writeFileSync(empFile, empContent);

const journalFile = 'app/journal-errors/edit/id/page.tsx';
let journalContent = fs.readFileSync(journalFile, 'utf8');

journalContent = journalContent.replace(
`        // سحب شجرة الحسابات
 (الحسابات الفرعية فقط اللي بتقبل حركات)`,
`        // سحب شجرة الحسابات
        // (الحسابات الفرعية فقط اللي بتقبل حركات)`
);
fs.writeFileSync(journalFile, journalContent);

console.log("Done");
