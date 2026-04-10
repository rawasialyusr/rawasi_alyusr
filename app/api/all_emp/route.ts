import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// دوال القراءة والتحويل
function readJSON(fileName: string) {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) { return []; }
}

function excelDateToJSDate(serial: any) {
  if (!serial) return new Date(0);
  if (isNaN(serial)) return new Date(serial);
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const employees = readJSON('all_emp');
    const dailyRecords = readJSON('daily_report');
    const housingRecords = readJSON('housing');
    const advanceRecords = readJSON('emp_adv');
    const deductionRecords = readJSON('emp_ded');

    const linkedData = employees.map((emp: any) => {
      // تنظيف الاسم للمطابقة (بناءً على ملف all_emp.json)
      const name = (emp.emp_name || "").trim();

      // دالة التحقق من الفترة الزمنية
      const isInRange = (recordDate: any) => {
        if (!startDate || !endDate) return true;
        const d = excelDateToJSDate(recordDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        d.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return d >= start && d <= end;
      };

      // 1. المستحق وأيام الحضور (من ملف daily_report.json)
      // الأسماء في ملفك هي: emp_name, date, attendance, d_w
      const myDaily = dailyRecords.filter((r: any) => 
        (r.emp_name || "").trim() === name && isInRange(r.date)
      );

      const totalAttendance = myDaily.reduce((sum: number, r: any) => sum + (Number(r.attendance) || 0), 0);
      
      // المستحق = جمع قيم d_w مباشرة لكل يوم
      const earnings = myDaily.reduce((sum: number, r: any) => sum + (Number(r.d_w) || 0), 0);

      // 2. المستلم / العهد (من ملف emp_adv.json)
      // الحقول في ملفك هي: FIELD3 (الاسم), FIELD2 (التاريخ), FIELD4 (المبلغ)
      const totalReceived = advanceRecords.filter((r: any) => 
        (r.FIELD3 || "").trim() === name && isInRange(r.FIELD2)
      ).reduce((sum: number, r: any) => sum + (Number(r.FIELD4) || 0), 0);

      // 3. السكن (من ملف housing.json)
      // الحقول هي: emp_name, amount
      const totalHousing = housingRecords.filter((r: any) => 
        (r.emp_name || "").trim() === name
      ).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

      // 4. الخصومات (من ملف emp_ded.json)
      // الحقول هي: emp_name, date, amount
      const totalDeductions = deductionRecords.filter((r: any) => 
        (r.emp_name || "").trim() === name && isInRange(r.date)
      ).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

      // 5. الصافي
      const net = earnings - totalHousing - totalDeductions - totalReceived;

      return {
        ...emp,
        work_days: totalAttendance, // يظهر في عمود أيام الدوام
        earnings: earnings,       // يظهر في عمود المستحق
        housing: totalHousing,
        deductions: totalDeductions,
        received: totalReceived,
        net_earnings: net
      };
    });

    return NextResponse.json(linkedData);
  } catch (error) {
    return NextResponse.json({ error: "خطأ في الربط" }, { status: 500 });
  }
}