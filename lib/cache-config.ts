export const SWR_CONFIG = {
    revalidateOnFocus: false, 
    revalidateIfStale: true,
    revalidateOnReconnect: true, // 👈 إضافة: التحديث عند عودة الاتصال
    dedupingInterval: 5000,
    errorRetryCount: 3,
    // 💡 إضافة: دالة الفيتشر الافتراضية لتقليل التكرار في ملفات اللوجيك
    fetcher: (resource: any, init: any) => fetch(resource, init).then(res => res.json())
};