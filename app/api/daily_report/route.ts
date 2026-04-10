import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_DIR = path.join(process.cwd(), 'data');

async function readJson(fileName: string) {
  try {
    const filePath = path.join(DATA_DIR, `${fileName}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function writeJson(fileName: string, data: any) {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. جلب البيانات (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  try {
    const reports = await readJson('daily_report');
    
    if (type === 'all_emp') {
      const employees = await readJson('all_emp');
      
      const data = employees.map((emp: any) => {
        // فلترة التقارير الخاصة بهذا الموظف بناءً على الاسم
        const empReports = reports.filter((r: any) => 
          (r.emp_name || r.Emp_Name) === (emp.emp_name || emp.Emp_Name)
        );

        // حساب إجمالي الساعات/الأيام المسجلة (حسب ما يمثله d_w)
        const totalDW = empReports.reduce((sum: number, r: any) => 
          sum + (Number(r.d_w || r.D_W) || 0), 0
        );

        // حساب المستحق: (إجمالي قيم اليومية المسجلة)
        // إذا كنت تضرب في راتب ثابت، استخدم: totalDW * Number(emp.Salary || 0)
        // أما إذا كانت الـ D_W هي القيمة المالية نفسها فاستخدم الحسبة التالية مباشرة:
        const calculatedEarnings = totalDW; 

        return { 
          ...emp, 
          work_days: empReports.length, // عدد أيام الحضور (عدد السجلات)
          earnings: calculatedEarnings   // إجمالي قيمة اليوميات (المستحق)
        };
      });
      
      return NextResponse.json(data);
    }
    // داخل دالة GET في ملف app/api/daily_report/route.ts
if (type === 'all_emp') {
  const employees = await readJson('all_emp');
  const reports = await readJson('daily_report');

  const data = employees.map((emp: any) => {
    // 1. فلترة سجلات التقرير اليومي لهذا الموظف
    const empReports = reports.filter((r: any) => 
      (r.emp_name || r.Emp_Name) === (emp.emp_name || emp.Emp_Name)
    );

    // 2. تجميع إجمالي الحضور (Attendance)
    const totalAttendance = empReports.reduce((sum: number, r: any) => {
      const attendanceVal = parseFloat(r.attendance || r.Attendance || 0);
      return sum + (isNaN(attendanceVal) ? 0 : attendanceVal);
    }, 0);

    // 3. جلب قيمة اليومية (d_w) من التقرير
    // ملحوظة: نأخذ آخر قيمة يومية مسجلة للموظف أو نعتمدها من ملف الموظفين
    const dailyRate = empReports.length > 0 
      ? Number(empReports[0].d_w || empReports[0].D_W || 0) 
      : Number(emp.salary || emp.Salary || 0);

    // 4. الحسبة: (إجمالي أيام الحضور) × (قيمة اليومية d_w)
    const totalEarnings = totalAttendance * dailyRate;

    return { 
      ...emp, 
      total_days: totalAttendance, // إجمالي أيام الحضور
      earnings: totalEarnings      // المستحق النهائي في عمود "المستحق"
    };
  });

  return NextResponse.json(data);
}
    
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// 2. إضافة بيانات (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newData = Array.isArray(body.data) ? body.data : [body.data];
    const reports = await readJson('daily_report');
    
    const timestampedData = newData.map((item: any) => ({
      id: item.id || Date.now() + Math.random(),
      date: item.date || new Date().toISOString().split('T')[0],
      ...item
    }));

    const updated = [...timestampedData, ...reports];
    await writeJson('daily_report', updated);
    return NextResponse.json({ success: true, count: timestampedData.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// 3. تحديث بيانات (PUT)
export async function PUT(request: Request) {
  try {
    const { id, updatedData } = await request.json();
    const reports = await readJson('daily_report');
    const index = reports.findIndex((r: any) => r.id === id);
    if (index === -1) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    reports[index] = { ...reports[index], ...updatedData };
    await writeJson('daily_report', reports);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// 4. حذف بيانات (DELETE)
export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();
    const reports = await readJson('daily_report');
    const filteredReports = reports.filter((r: any) => !ids.includes(r.id));
    await writeJson('daily_report', filteredReports);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}