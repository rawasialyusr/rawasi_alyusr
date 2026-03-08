"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Home() {
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const loadData = async () => {
    const { data } = await supabase.from('Daily_Report').select('*').order('Date', { ascending: false });
    if (data) setReports(data);
  };

  useEffect(() => { loadData(); }, []);

  const deleteSelected = async () => {
    if (confirm(`⚠️ هل تريد حذف ${selected.length} سجل نهائياً؟`)) {
      await supabase.from('Daily_Report').delete().in('id', selected);
      setSelected([]); loadData();
    }
  };

  const th = { padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #3b82f6', color: '#fbbf24', whiteSpace: 'nowrap' as any };
  const td = { padding: '12px', textAlign: 'right' as const, borderBottom: '1px solid #334155' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
        <h1 style={{ color: '#fbbf24', margin: 0 }}>📑 تقرير يومي</h1>
        {selected.length > 0 && (
          <button onClick={deleteSelected} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            🗑️ مسح المحدد ({selected.length})
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#1e293b', borderRadius: '15px', overflowX: 'auto', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1400px' }}>
          <thead>
            <tr style={{ backgroundColor: '#334155' }}>
              <th style={th}><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? reports.map(r => r.id) : [])} checked={selected.length === reports.length && reports.length > 0} /></th>
              <th style={th}>التاريخ</th><th style={th}>المقاول الرئيسي</th><th style={th}>اسم الموظف</th>
              <th style={th}>الموقع</th><th style={th}>البند</th><th style={th}>الإنتاج</th>
              <th style={th}>الوحدة</th><th style={th}>المستوى</th><th style={th}>اليومية</th>
              <th style={th}>الحالة</th><th style={th}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ backgroundColor: selected.includes(r.id) ? '#2d3748' : 'transparent' }}>
                <td style={td}><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])} /></td>
                <td style={td}>{r.Date}</td><td style={td}>{r.Main_Cont}</td>
                <td style={td}><a href={`/profile/${encodeURIComponent(r.Emp_Name)}`} style={{color:'#60a5fa', fontWeight:'bold', textDecoration:'none'}}>👤 {r.Emp_Name}</a></td>
                <td style={td}>{r.Site}</td><td style={td}>{r.Item}</td><td style={td}>{r.Prod}</td>
                <td style={td}>{r.Unit}</td><td style={td}>{r.Sk_Level}</td><td style={{...td, color:'#4ade80', fontWeight:'bold'}}>{r.D_W}</td>
                <td style={td}>{r.Attendance}</td><td style={{...td, fontSize:'11px', color:'#94a3b8'}}>{r.Notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}