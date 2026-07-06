import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
    try {
        const { htmlContent } = await request.json();

        // 🚀 تشغيل متصفح سيرفر مخفي
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        
        const page = await browser.newPage();
        
        // 🚀 حقن كود الـ HTML
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // 🚀 إصدار ملف الـ PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        await browser.close();

        // 🚀 إرسال الملف
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=statement.pdf',
            },
        });

    } catch (error: any) {
        // 🔥 طباعة الخطأ في تيرمينال الـ VS Code
        console.error("🔥 PDF Generation Error (Backend): ", error);
        
        // 🔥 إرسال الخطأ الحقيقي للـ Frontend
        return NextResponse.json({ error: error.message || "Unknown Server Error" }, { status: 500 });
    }
}