"use server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

export async function getTableData(tableName: string, filters: any = {}) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('daily_report');

    let query: any = {};
    if (filters.searchName) query.emp_name = { $regex: filters.searchName, $options: "i" };
    if (filters.searchSite) query.site = { $regex: filters.searchSite, $options: "i" };

    const data = await collection.find(query).sort({ date: -1 }).toArray();

    // نحول المصفوفة لنص JSON خام تماماً ونرسلها
    // هذا يمنع Next.js من إضافة _debugInfo ويحل مشكلة الـ CSP
    return JSON.stringify(data.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    })));
  } catch (error) {
    return JSON.stringify([]);
  }
}