import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// 🗺️ خريطة العناوين الخاصة بملف الإكسيل المحول
const EXCEL_MAP = {
  ID: "FIELD1",
  DATE: "FIELD2",
  NAME: "FIELD3",
  AMOUNT: "FIELD4",
  SITE: "FIELD5",
  NOTES: "FIELD6"
};

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'emp_adv.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const rawData = JSON.parse(fileContents);

    // معالجة البيانات وتجهيزها للجدول
    const processedData = rawData
      .filter((row: any) => row[EXCEL_MAP.NAME] && row[EXCEL_MAP.NAME] !== "emp_name")
      .map((row: any) => ({
        _id: row[EXCEL_MAP.ID] || Math.random().toString(36).substr(2, 9),
        Date: row[EXCEL_MAP.DATE],
        Emp_Name: row[EXCEL_MAP.NAME],
        Advance_Val: row[EXCEL_MAP.AMOUNT],
        Site: row[EXCEL_MAP.SITE] || "غير محدد",
        Notes: row[EXCEL_MAP.NOTES]
      }));

    return NextResponse.json(processedData);
  } catch (error) {
    console.error("Advances API Error:", error);
    return NextResponse.json([]);
  }
}