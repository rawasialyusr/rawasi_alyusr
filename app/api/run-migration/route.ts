import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  try {
    const sql = postgres('postgres://postgres:Mooya12345!@db.ggzuaaivrrcuowwemobt.supabase.co:5432/postgres', { ssl: 'require' });
    
    await sql`ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;`;
    
    await sql`ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
        CHECK (status IN ('مسودة', 'جاري التنفيذ', 'مكتمل', 'موقوف', 'جاري التسليم', 'مفوتر', 'تم التحصيل'));`;

    await sql.end();
    
    return NextResponse.json({ success: true, message: 'Constraint updated successfully!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
