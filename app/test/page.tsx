"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkData() {
            setLoading(true);
            // 1. فحص رؤوس القيود
            const { data: h } = await supabase.from('journal_headers').select('*');
            setHeaders(h || []);

            // 2. فحص أطراف القيود
            const { data: l } = await supabase.from('journal_lines').select('*');
            setData(l || []);
            
            setLoading(false);
        }
        checkData();
    }, []);

    return (
        <div style={{ padding: '40px', direction: 'rtl', fontFamily: 'Cairo' }}>
            <h1 style={{ color: '#43342E' }}>🕵️ ميكروسكوب فحص القيود</h1>
            <p>الصفحة دي بتشوف الجداول "خام" من غير أي فلاتر</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* جدول رؤوس القيود */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #E6D5C3' }}>
                    <h3>1️⃣ جدول رؤوس القيود (Headers)</h3>
                    <p>العدد المكتشف: {headers.length}</p>
                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#8C6A5D', color: 'white' }}>
                                <th>ID القيد</th>
                                <th>التاريخ</th>
                                <th>البيان</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {headers.map(h => (
                                <tr key={h.id}>
                                    <td>{h.id.substring(0,8)}...</td>
                                    <td>{h.entry_date}</td>
                                    <td>{h.description}</td>
                                    <td style={{ color: h.status === 'posted' ? 'green' : 'red' }}>{h.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* جدول أطراف القيود */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '2px solid #E6D5C3' }}>
                    <h3>2️⃣ جدول أطراف القيود (Lines)</h3>
                    <p>العدد المكتشف: {data.length}</p>
                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#C5A059', color: 'white' }}>
                                <th>ID الحساب</th>
                                <th>البيان</th>
                                <th>مدين</th>
                                <th>دائن</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((l, i) => (
                                <tr key={i}>
                                    <td>{String(l.account_id).substring(0,8)}...</td>
                                    <td>{l.item_name}</td>
                                    <td style={{ color: 'green' }}>{l.debit}</td>
                                    <td style={{ color: 'red' }}>{l.credit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {data.length === 0 && !loading && (
                <div style={{ marginTop: '30px', padding: '20px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', textAlign: 'center' }}>
                    ⚠️ <b>تنبيه:</b> جدول القيود فاضي تماماً في الداتا بيز. ده معناه إن عملية الترحيل من صفحة المصروفات مكملتش للآخر أو حصل فيها خطأ.
                </div>
            )}
        </div>
    );
}