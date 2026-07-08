const fs = require('fs');

function addSingleStatusUpdate() {
    let logicPath = 'app/joborders/joborders_logic.ts';
    let logicContent = fs.readFileSync(logicPath, 'utf8');

    if (!logicContent.includes('handleUpdateSingleStatus')) {
        const mutationCode = `
    const updateSingleStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('job_orders').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            showToast(\`تم تغيير الحالة إلى \${variables.status} بنجاح ✅\`, "success");
            queryClient.invalidateQueries({ queryKey: ['job_orders'] });
        },
        onError: (err: any) => showToast(\`خطأ في تحديث الحالة: \${err.message}\`, "error")
    });

    const handleUpdateSingleStatus = (id: string, newStatus: string) => {
        updateSingleStatusMutation.mutate({ id, status: newStatus });
    };
`;
        
        logicContent = logicContent.replace(
            /const isSaving = saveMutation\.isPending.*?;\n/,
            match => mutationCode + "\n    " + match
        );

        logicContent = logicContent.replace(
            /handleDeleteSelected,\n/,
            "handleDeleteSelected,\n        handleUpdateSingleStatus,\n"
        );

        fs.writeFileSync(logicPath, logicContent);
    }

    let pagePath = 'app/joborders/page.tsx';
    let pageContent = fs.readFileSync(pagePath, 'utf8');

    if (!pageContent.includes('logic.handleUpdateSingleStatus')) {
        const selectCode = `
                    <select 
                        value={row.status}
                        onChange={(e) => { e.stopPropagation(); logic.handleUpdateSingleStatus(row.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, padding: '8px', background: 'rgba(255, 255, 255, 0.8)', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="مسودة">📝 مسودة</option>
                        <option value="جاري التنفيذ">⏳ جاري التنفيذ</option>
                        <option value="مكتمل">✅ مكتمل</option>
                        <option value="موقوف">⏸️ موقوف</option>
                    </select>
`;
        
        pageContent = pageContent.replace(
            /<div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>\s*<button/m,
            `<div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>` + selectCode + `                    <button`
        );

        fs.writeFileSync(pagePath, pageContent);
    }
}

addSingleStatusUpdate();
