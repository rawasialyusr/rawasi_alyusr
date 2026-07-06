/**
 * دالة مساعدة لجلب البيانات من Supabase على مراحل (Pagination)
 * لتجاوز حد الـ 1000 صف ولحماية البيانات من التكرار في حالة تزامن الإضافات.
 * 
 * @param buildQuery دالة تقوم بإرجاع كائن الاستعلام الخاص بـ Supabase (بدون استدعاء .range أو .limit)
 * @param primaryKey الحقل الأساسي المستخدم لمنع التكرار (الافتراضي 'id')
 * @param maxRows الحد الأقصى المتوقع للبيانات كحماية إضافية للذاكرة (الافتراضي 50000)
 * @param step حجم الدفعة في كل طلب (الافتراضي 1000)
 * @returns مصفوفة تحتوي على جميع البيانات المدمجة والخالية من التكرار
 */
export async function fetchPaginatedData(
    buildQuery: () => any, 
    primaryKey: string = 'id',
    maxRows: number = 50000,
    step: number = 1000
) {
    const allData: any[] = [];
    const seenIds = new Set<string>();
    let from = 0;
    let hasMore = true;
    let loopGuard = 0;
    const maxLoops = Math.ceil(maxRows / step);

    while (hasMore && loopGuard < maxLoops) {
        loopGuard++;
        // استدعاء buildQuery يضمن لنا إنشاء كائن استعلام جديد نظيف في كل مرة
        // لمنع تداخل حالة الـ Query Builder في Supabase (v2)
        const query = buildQuery().range(from, from + step - 1);
        
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        if (data && data.length > 0) {
            for (const row of data) {
                const id = String(row[primaryKey]);
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    allData.push(row);
                }
            }
            from += step;
            if (data.length < step) hasMore = false;
        } else {
            hasMore = false;
        }
    }
    return allData;
}
