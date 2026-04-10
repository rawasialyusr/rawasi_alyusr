import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// تحديد مسار الملف بدقة
const DATA_PATH = path.join(process.cwd(), 'data', 'housing.json');

// دالة الـ GET لجلب البيانات
export async function GET() {
  try {
    // 1. التأكد من وجود المجلد والملف
    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. قراءة الملف
    const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
    
    // 3. التأكد أن الملف ليس فارغاً
    if (!fileContent.trim()) {
      return NextResponse.json([]);
    }

    const data = JSON.parse(fileContent);
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// أضفنا هذه الدالة فارغة لتجنب خطأ 405 عند استدعاء POST مستقبلاً
export async function POST(request: Request) {
    return NextResponse.json({ message: "POST method active" });
}