const fs = require('fs');

const lines = fs.readFileSync('app/joborders/page.tsx', 'utf8').split(/\r?\n/);

const newFiltersLines = `        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                <SmartCombo 
                    label="تصفية بالمشروع"
                    icon="🏢"
                    table="projects"
                    displayCol="project_name"
                    placeholder="ابحث عن مشروع..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setProjectFilter(item?.id || '')}
                />

                <SmartCombo 
                    label="تصفية بالمقاول / الجهة"
                    icon="🤝"
                    table="partners"
                    displayCol="name"
                    placeholder="ابحث عن مقاول..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setPartnerFilter(item?.id || '')}
                />

                <SmartCombo 
                    label="تصفية بالبند (العمل)"
                    icon="🛠️"
                    table="boq_budget"
                    displayCol="work_item"
                    placeholder="ابحث عن بند..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setWorkitemFilter(item?.work_item || '')}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#43342e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📊 حالة الأمر
                    </label>
                    <select 
                        value={logic.statusFilter}
                        onChange={(e) => logic.setStatusFilter(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.3)', background: 'rgba(255, 255, 255, 0.8)', color: '#1e293b', outline: 'none', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    >
                        <option value="">جميع الحالات</option>
                        <option value="مسودة">📝 مسودة</option>
                        <option value="جاري التنفيذ">⏳ جاري التنفيذ</option>
                        <option value="مكتمل">✅ مكتمل</option>
                        <option value="موقوف">⏸️ موقوف</option>
                        <option value="جاري التسليم">🚚 جاري التسليم</option>
                        <option value="مفوتر">🧾 مفوتر</option>
                        <option value="تم التحصيل">💰 تم التحصيل</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#43342e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        👷‍♂️ جهة التنفيذ
                    </label>
                    <select 
                        value={logic.executorFilter}
                        onChange={(e) => logic.setExecutorFilter(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.3)', background: 'rgba(255, 255, 255, 0.8)', color: '#1e293b', outline: 'none', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    >
                        <option value="">جميع الجهات</option>
                        <option value="مقاول باطن">🤝 مقاول باطن</option>
                        <option value="تنفيذ ذاتي">👷‍♂️ تنفيذ ذاتي (عمالة الشركة)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#43342e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💰 الحالة المالية
                    </label>
                    <select 
                        value={logic.financialFilter}
                        onChange={(e) => logic.setFinancialFilter(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.3)', background: 'rgba(255, 255, 255, 0.8)', color: '#1e293b', outline: 'none', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    >
                        <option value="">جميع الحالات</option>
                        <option value="رابح">📈 رابح</option>
                        <option value="خاسر">📉 خاسر</option>
                        <option value="تعادل">⚖️ تعادل</option>
                        <option value="لم يبدأ">⏳ لم يبدأ</option>
                    </select>
                </div>
            </div>
        }
        onSearch={logic.setGlobalSearch}
        onDateFilter={(start, end) => { logic.setDateFrom(start); logic.setDateTo(end); }}
        watchDeps={[logic.selectedIds, logic.allFiltered.length, logic.statusFilter, logic.executorFilter, logic.workitemFilter, logic.projectFilter, logic.partnerFilter, logic.financialFilter]}
      />`.split(/\n/);

// Find indices
const startIdx = lines.findIndex(l => l.includes('customFilters={'));
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('watchDeps=')) {
        endIdx = i + 1; // skip watchDeps and the closing tag `/>` if it's on the next line or same line
        if (lines[i+1] && lines[i+1].includes('/>')) {
            endIdx = i + 2;
        }
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx, ...newFiltersLines);
    fs.writeFileSync('app/joborders/page.tsx', lines.join('\r\n'));
    console.log('Success replacing lines from ' + startIdx + ' to ' + endIdx);
} else {
    console.log('Failed to find start or end index', startIdx, endIdx);
}
