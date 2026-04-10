import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// تحديد مسار ملف الـ JSON في قاعدة البيانات المحلية
const filePath = path.join(process.cwd(), 'data', 'emp_ded.json');

// دالة مساعدة لقراءة البيانات
const readData = () => {
  if (!fs.existsSync(filePath)) return [];
  const jsonData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(jsonData || '[]');
};

// دالة مساعدة لحفظ البيانات
const saveData = (data: any) => {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// 1. GET: جلب كل الخصومات
export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

// 2. POST: إضافة خصم جديد
export async function POST(request: Request) {
  try {
    const newEntry = await request.json();
    const data = readData();
    
    // إضافة ID فريد لو مش موجود
    const entryWithId = { 
      _id: Date.now().toString(), 
      ...newEntry,
      createdAt: new Date().toISOString() 
    };
    
    data.push(entryWithId);
    saveData(data);
    
    return NextResponse.json(entryWithId, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}

// 3. PUT: تحديث خصم موجود
export async function PUT(request: Request) {
  try {
    const updatedEntry = await request.json();
    let data = readData();
    
    const idToUpdate = updatedEntry._id?.$oid || updatedEntry._id;
    
    data = data.map((item: any) => {
      const itemId = item._id?.$oid || item._id;
      return itemId === idToUpdate ? { ...item, ...updatedEntry } : item;
    });
    
    saveData(data);
    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update data" }, { status: 500 });
  }
}

// 4. DELETE: حذف سجل أو مجموعة سجلات
export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json(); // ننتظر مصفوفة IDs
    let data = readData();
    
    data = data.filter((item: any) => {
      const itemId = item._id?.$oid || item._id;
      return !ids.includes(String(itemId));
      
    });
    
    saveData(data);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
  }
}
