const fs = require('fs');

function addJobOrderStatuses() {
    let pagePath = 'app/joborders/page.tsx';
    let content = fs.readFileSync(pagePath, 'utf8');

    // 1. Update filter dropdown
    const filterOptionsOld = `<option value="موقوف">⏸️ موقوف</option>`;
    const filterOptionsNew = `<option value="موقوف">⏸️ موقوف</option>
                        <option value="جاري التسليم">🚚 جاري التسليم</option>
                        <option value="مفوتر">🧾 مفوتر</option>
                        <option value="تم التحصيل">💰 تم التحصيل</option>`;
    
    // Only replace the first occurrence (which is the filter)
    content = content.replace(filterOptionsOld, filterOptionsNew);

    // 2. Update card dropdown
    // It's the same string but let's replace the second occurrence
    // Actually, let's just do a global replace for both if we use a strict match.
    // Let's use a regex that matches the exact options block
    content = content.replace(/<option value="موقوف">⏸️ موقوف<\/option>/g, filterOptionsNew);

    // 3. Add badge styles
    const badgeStylesOld = `if (row.status === 'موقوف') badgeStyle = { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', icon: '⏸️' };`;
    const badgeStylesNew = `if (row.status === 'موقوف') badgeStyle = { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', icon: '⏸️' };
              if (row.status === 'جاري التسليم') badgeStyle = { bg: '#fef08a', color: '#a16207', dot: '#eab308', icon: '🚚' };
              if (row.status === 'مفوتر') badgeStyle = { bg: '#e0e7ff', color: '#4338ca', dot: '#6366f1', icon: '🧾' };
              if (row.status === 'تم التحصيل') badgeStyle = { bg: '#d1fae5', color: '#047857', dot: '#10b981', icon: '💰' };`;

    content = content.replace(badgeStylesOld, badgeStylesNew);

    // We also need to fix the duplicate replacements just in case
    // Wait, the regex replace for `<option value="موقوف">⏸️ موقوف</option>` will replace all occurrences.
    // In `page.tsx`, `<option value="موقوف">⏸️ موقوف</option>` appears in the filter dropdown and in the card dropdown.
    // But it might also appear in `JobOrderModal` if it's imported there? No, `JobOrderModal.tsx` is a separate file.
    
    fs.writeFileSync(pagePath, content);
    console.log("Updated page.tsx");
}

addJobOrderStatuses();
