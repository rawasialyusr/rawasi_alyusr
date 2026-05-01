// src/lib/accounting.ts

/**
 * 💎 الميثاق الماسي - البند السابع: مصفوفة حسابات الذمم
 * هذه هي الحسابات "الشخصية" الوحيدة المسموح لها باستقبال partner_id
 */
export const PERSONAL_ACCOUNTS = [
    '4f828d0d-a1f4-4762-83e3-c17dafae802d', // 123 - العملاء (أصحاب المشاريع)
    '2ca6f54c-5f37-49a0-8c41-e37f94b09752', // 211 - الموردين (مواد بناء وغيرها)
    '27f37adf-c0ec-4b40-80d0-2b36b853fd4b', // 212 - مقاولي الباطن
    '39f878cd-dc58-4a2a-a199-50f6fca983d4', // 216 - رواتب وأجور مستحقة
    '31c9923a-3629-4f3f-b661-b86df51c8e09'  // 128 - سلف موظفين الشركة
];

/**
 * 💎 الميثاق الماسي - البند السابع: دالة التوجيه الذكي
 * @param accountId - رقم الحساب المراد الرمي عليه
 * @param partnerId - رقم الشريك (العميل/المقاول/المورد) المستخرج من العملية
 * @returns {string | null} - يرجع رقم الشريك إذا كان الحساب شخصياً، ويرجع null إذا كان حساب شركة
 */
export function resolvePartnerId(accountId: string | null | undefined, partnerId: string | null | undefined): string | null {
    if (!accountId || !partnerId) return null;
    
    // إذا كان الحساب ضمن قائمة الحسابات الشخصية، اسمح بتمرير البارتنر
    if (PERSONAL_ACCOUNTS.includes(accountId)) {
        return partnerId;
    }
    
    // أي حساب آخر (إيراد، مصروف، ضريبة، خزينة) يتم تفريغ البارتنر منه إجبارياً
    return null;
}

/**
 * دالة مساعدة لتنظيف المعرفات (UUIDs) قبل إرسالها لقاعدة البيانات
 */
export function cleanId(id: any): string | null {
    return (id && typeof id === 'string' && id.trim() !== '') ? id : null;
}