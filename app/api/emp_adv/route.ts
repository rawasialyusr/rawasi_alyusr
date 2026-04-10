import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'emp_adv.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const rawData = JSON.parse(fileContents);

    // فلترة البيانات وتجهيزها بناءً على تقسيم الـ FIELDS في ملفك
    // بنبدأ من الصف اللي فيه بيانات فعلاً وبنستبعد الصفوف الفاضية
    const processedData = rawData
      .filter((item: any) => item.FIELD3 && item.FIELD3 !== "emp_name" && item.FIELD3 !== "") 
      .map((item: any) => ({
        _id: item.FIELD1 || Math.random().toString(36).substr(2, 9),
        Date: item.FIELD2,      // FIELD2 هو التاريخ
        Emp_Name: item.FIELD3,  // FIELD3 هو اسم الموظف
        Advance_Val: item.FIELD4, // FIELD4 هو المبلغ
        Site: item.FIELD5 || "غير محدد", // FIELD5 هو البيان أو الموقع
        Notes: item.FIELD6      // FIELD6 هو الملاحظات
      }));

    return NextResponse.json(processedData);
  } catch (error) {
    console.error("Error processing JSON:", error);
    return NextResponse.json([]);
  }
}