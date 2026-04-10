import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// دالة مساعدة للقراءة والكتابة
function processFileAction(fileName: string, newData: any) {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  let data = [];
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    data = content ? JSON.parse(content) : [];
  }
  // إضافة المعرف الفريد والتاريخ التلقائي إذا لم يوجد
  const entry = {
    id: Date.now() + Math.random(),
    ...newData
  };
  data.unshift(entry); // إضافة في بداية الملف
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return entry;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'daily':
        processFileAction('daily_report', {
          emp_name: data.emp_name,
          date: data.date,
          attendance: Number(data.attendance),
          d_w: Number(data.d_w),
          notes: data.notes
        });
        break;

      case 'advance':
        processFileAction('emp_adv', {
          FIELD3: data.emp_name,
          FIELD2: data.date,
          FIELD4: Number(data.amount),
          FIELD6: data.notes
        });
        break;

      case 'deduction':
        processFileAction('emp_ded', {
          emp_name: data.emp_name,
          date: data.date,
          amount: Number(data.amount),
          notes: data.notes
        });
        break;

      case 'housing':
        processFileAction('housing', {
          emp_name: data.emp_name,
          amount: Number(data.amount),
          notes: data.notes,
          deduction_month: new Date(data.date).getMonth() + 1
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}