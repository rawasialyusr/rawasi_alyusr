"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const THEME = {
  primary: '#0f172a',
  accent: '#ca8a04',
  accentLight: '#eab308',
  white: '#ffffff',
  slate: '#94a3b8',
  danger: '#ef4444',
  warning: '#f59e0b',
  glassBg: 'rgba(15, 23, 42, 0.75)',
  glassBorder: 'rgba(202, 138, 4, 0.3)'
};

export default function JournalErrorsPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1️⃣ محرك الفحص: يسحب كل القيود ويكتشف الأخطاء
  const fetchAndAuditEntries = async () => {
    setIsLoading(true);
    try {
      // سحب كل الرؤوس والأطراف
      const { data: headers } = await supabase.from('journal_headers').select('*');
      const { data: lines } = await supabase.from('journal_lines').select('*');

      if (!headers || !lines) return;

      const faultyEntries: any[] = [];

      headers.forEach(header => {
        const entryLines = lines.filter(l => l.header_id === header.id);
        
        let totalDebit = 0;
        let totalCredit = 0;
        let hasMissingAccount = false;

        entryLines.forEach(line => {
          totalDebit += Number(line.debit || 0);
          totalCredit += Number(line.credit || 0);
          if (!line.account_id) hasMissingAccount = true; // سطر بدون حساب
        });

        // تقريب الأرقام لتجنب فوارق الكسور العشرية البسيطة جداً
        totalDebit = Number(totalDebit.toFixed(2));
        totalCredit = Number(totalCredit.toFixed(2));
        const diff = Math.abs(totalDebit - totalCredit);
        
        const isUnbalanced = diff !== 0;
        const isEmpty = entryLines.length === 0;

        // إذا كان هناك أي خطأ، نضيفه لقائمة الأخطاء
        if (isUnbalanced || hasMissingAccount || isEmpty) {
          faultyEntries.push({
            ...header,
            totalDebit,
            totalCredit,
            diff,
            errorType: isEmpty ? 'قيد فارغ' : hasMissingAccount ? 'حساب مفقود' : 'قيد غير متزن',
            lineCount: entryLines.length
          });
        }
      });

      setErrors(faultyEntries);
    } catch (error: any) {
      alert("❌ خطأ في فحص القيود: " + error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAndAuditEntries();
  }, []);

  // 🧮 إحصائيات الأخطاء
  const summary = useMemo(() => {
    const totalErrors = errors.length;
    const totalDiff = errors.reduce((acc, curr) => acc + (curr.diff || 0), 0);
    return { totalErrors, totalDiff };
  }, [errors]);

  return (
    <div className="app-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
        
        .app-wrapper {
          min-height: 100vh; display: flex; direction: rtl;
          background-image: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), url('/ryc_login.jpeg');
          background-size: cover; background-position: center; background-attachment: fixed; color: ${THEME.white};
        }

        .main-content { flex: 1; height: 100vh; overflow-y: auto; padding: 30px 40px; }

        .page-header {
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px 30px; border-radius: 20px; margin-bottom: 25px; backdrop-filter: blur(10px);
        }

        .operations-center {
          background: rgba(239, 68, 68, 0.05); /* خلفية حمراء خفيفة للأخطاء */
          backdrop-filter: blur(20px); border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 24px; padding: 25px; margin-bottom: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.3);
        }

        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 10px; }
        .summary-card {
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px; padding: 15px; text-align: center;
        }
        .summary-value { font-size: 28px; font-weight: 900; font-family: monospace; color: ${THEME.danger}; }
        
        .table-header {
          display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr 1fr 1.5fr; 
          padding: 15px 20px; font-weight: 900; color: ${THEME.accent}; 
          background: rgba(202, 138, 4, 0.1); border-radius: 12px; margin-bottom: 15px;
        }

        .err-row { 
          background: rgba(255, 255, 255, 0.02); border-radius: 12px; margin-bottom: 8px; 
          display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr 1fr 1.5fr; 
          align-items: center; padding: 15px 20px; 
          border: 1px solid rgba(239, 68, 68, 0.3); transition: 0.2s;
        }
        .err-row:hover { background: rgba(239, 68, 68, 0.05); }

        .badge-error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; border: 1px solid ${THEME.danger}; }

        .btn-fix {
          padding: 8px 15px; background: linear-gradient(135deg, ${THEME.accent}, ${THEME.accentLight});
          color: ${THEME.primary}; border: none; border-radius: 8px; font-weight: 900; cursor: pointer; transition: 0.3s;
        }
        .btn-fix:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(202, 138, 4, 0.3); }
      `}</style>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: THEME.white, marginBottom: '5px' }}>مكتشف أخطاء القيود</h1>
            <p style={{ color: THEME.slate, fontSize: '14px', fontWeight: 600 }}>لوحة المراجعة المالية - رواسي اليسر</p>
          </div>
          <div><img src="/RYC_Logo.png" alt="Logo" style={{ height: '70px', filter: 'drop-shadow(0px 5px 10px rgba(0,0,0,0.5))' }} /></div>
        </header>

        <div className="operations-center">
          <div style={{ color: THEME.danger, fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>
            ⚠️ تنبيه: هذه القيود تسبب خللاً في ميزان المراجعة ويجب معالجتها.
          </div>
          <div className="summary-grid">
            <div className="summary-card">
              <div style={{ color: THEME.slate, fontSize: '14px', fontWeight: 700 }}>عدد القيود الخاطئة</div>
              <div className="summary-value">{summary.totalErrors}</div>
            </div>
            <div className="summary-card">
              <div style={{ color: THEME.slate, fontSize: '14px', fontWeight: 700 }}>إجمالي قيمة الفروقات المادية</div>
              <div className="summary-value">{summary.totalDiff.toLocaleString()}</div>
            </div>
          </div>
          <button onClick={fetchAndAuditEntries} style={{ padding: '10px 20px', background: 'transparent', color: THEME.white, border: `1px solid ${THEME.slate}`, borderRadius: '10px', cursor: 'pointer', marginTop: '10px' }}>
            🔄 إعادة الفحص
          </button>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ minWidth: '1000px' }}>
            <div className="table-header">
               <div>رقم القيد</div>
               <div>البيان / الوصف</div>
               <div>تاريخ القيد</div>
               <div style={{textAlign: 'center'}}>إجمالي مدين</div>
               <div style={{textAlign: 'center'}}>إجمالي دائن</div>
               <div style={{textAlign: 'center'}}>الفرق</div>
               <div style={{textAlign: 'center'}}>الإجراء</div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 900, fontSize: '18px', color: THEME.accent }}>
                ⏳ جاري فحص القيود في قاعدة البيانات...
              </div>
            ) : errors.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '50px', fontWeight: 900, fontSize: '22px', color: '#4ade80' }}>
                🎉 مبروك! ميزان المراجعة متزن ولا توجد أي أخطاء في القيود.
              </div>
            ) : (
              errors.map((err, idx) => (
                <div key={idx} className="err-row">
                  <div style={{ fontWeight: 900, color: THEME.white }}>#{err.id}</div>
                  <div style={{ color: THEME.slate, fontSize: '14px' }}>
                    {err.description || 'بدون وصف'}
                    <span className="badge-error" style={{ marginRight: '10px' }}>{err.errorType}</span>
                  </div>
                  <div style={{ color: THEME.white, fontSize: '14px' }}>{err.entry_date || 'غير محدد'}</div>
                  <div style={{ textAlign: 'center', color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{err.totalDebit.toLocaleString()}</div>
                  <div style={{ textAlign: 'center', color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>{err.totalCredit.toLocaleString()}</div>
                  <div style={{ textAlign: 'center', color: THEME.danger, fontWeight: 900, fontFamily: 'monospace' }}>{err.diff.toLocaleString()}</div>
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      className="btn-fix"
                      onClick={() => router.push(`/journal/edit/${err.id}`)}
                    >
                      🛠️ معالجة القيد
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}