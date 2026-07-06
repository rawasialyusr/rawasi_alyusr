const fs = require('fs');
let code = fs.readFileSync('app/overhead/page.tsx', 'utf8');

code = code.replace(/item\[\"التصنيف\"\]/g, 'item[\"التصنيف الرئيسي\"]');
code = code.replace(/item\[\"البيان والوصف\"\]/g, 'item[\"البيان / الوصف\"]');
code = code.replace(/item\[\"قيمة الفاتورة الأصلية \(جنيه\)\"\]/g, 'item[\"قيمة الفاتورة الأصلية (ر.س)\"]');
code = code.replace(/item\[\"نصيب المشروع \(المبلغ المحمل\)\"\]/g, 'item[\"المبلغ المحمل (ر.س)\"]');

fs.writeFileSync('app/overhead/page.tsx', code);
