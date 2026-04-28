"use client";
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';
import { useToast } from '@/lib/toast-context'; 

export default function ExpenseFormModal({ 
    isOpen, 
    onClose, 
    record, 
    setRecord, 
    onSave, 
    isSaving, 
    projects, 
    historicalData,
    isDistributionEnabled,
    setIsDistributionEnabled,
    calculateDistribution
}: any) {
    const { showToast } = useToast();
    const [mounted, setMounted] = useState(false);
    
    // 📸 حالات ومراجع الكاميرا والمرفقات
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // =========================================================================
    // 📷 دوال التقاط الصور والمرفقات
    // =========================================================================
    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { 
            alert("خطأ في تشغيل الكاميرا"); 
            setIsCameraOpen(false); 
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0);
            const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
            setImagePreview(imageDataUrl);
            setRecord({ ...record, invoice_image: imageDataUrl });
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) { 
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); 
        }
        setIsCameraOpen(false);
    };

    // =========================================================================
    // 🧮 الحسابات اللحظية (تجمع بين الخانات العلوية + البنود المضافة للجدول)
    // =========================================================================
    
    // 1. المبالغ المكتوبة حالياً في الخانات
    const currentQty = Number(record?.quantity || 0);
    const currentPrice = Number(record?.unit_price || 0);
    const currentVat = Number(record?.vat_amount || 0);
    const currentDiscount = Number(record?.discount_amount || 0);

    // 2. إجماليات الأصناف الموجودة في الجدول (lines_data)
    const addedLines = record?.lines_data || [];
    const linesSubtotal = addedLines.reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.unit_price)), 0);
    const linesVat = addedLines.reduce((sum: number, line: any) => sum + Number(line.vat_amount || 0), 0);
    const linesDiscount = addedLines.reduce((sum: number, line: any) => sum + Number(line.discount_amount || 0), 0);

    // 3. المجاميع النهائية (تحديث لحظي لا يمكن أن يكون 0 إذا كتب المستخدم شيئاً)
    const finalSubtotal = (currentQty * currentPrice) + linesSubtotal;
    const finalVat = currentVat + linesVat;
    const finalDiscount = currentDiscount + linesDiscount;
    const finalTotal = finalSubtotal + finalVat - finalDiscount;

    // =========================================================================
    // 🚀 دوال إضافة وحذف الأصناف من الجدول (نفس ميكانيكية الفواتير)
    // =========================================================================
    const handleAddStatement = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!record.description) return showToast("يرجى إدخال اسم الصنف أو البيان أولاً ⚠️", "warning");
        if (currentQty <= 0 || currentPrice <= 0) return showToast("الكمية والسعر يجب أن يكونا أكبر من صفر ⚠️", "warning");

        const newLine = {
            description: record.description,
            quantity: currentQty,
            unit_price: currentPrice,
            vat_amount: currentVat,
            discount_amount: currentDiscount,
            total_price: (currentQty * currentPrice) + currentVat - currentDiscount
        };

        setRecord({
            ...record,
            lines_data: [...addedLines, newLine],
            // تصفير الخانات بعد الإضافة للجدول
            description: '',
            quantity: '',
            unit_price: '',
            vat_amount: '',
            discount_amount: ''
        });
        showToast("تمت إضافة الصنف للجدول بنجاح ✅", "success");
    };

    const handleRemoveLine = (indexToRemove: number) => {
        const newLines = addedLines.filter((_: any, idx: number) => idx !== indexToRemove);
        setRecord({ ...record, lines_data: newLines });
    };

    // =========================================================================
    // 🛡️ معترض الحفظ النهائي
    // =========================================================================
    const handleValidateAndSave = () => {
        if (!record.exp_date) return showToast("تاريخ المصروف مطلوب ⚠️", "warning");
        if (!record.creditor_account) return showToast("حساب المصروف المدين مطلوب ⚠️", "warning");
        
        let finalLinesToSave = addedLines;

        // لو اليوزر كتب بيانات فوق ونسي يدوس (إضافة ➕)، بنضيفها أوتوماتيك للحفظ
        if (record.description && currentQty > 0 && currentPrice > 0) {
            finalLinesToSave = [...finalLinesToSave, {
                description: record.description,
                quantity: currentQty,
                unit_price: currentPrice,
                vat_amount: currentVat,
                discount_amount: currentDiscount
            }];
        }

        if (finalLinesToSave.length === 0) {
            return showToast("يرجى إدخال صنف أو بيان واحد على الأقل للمصروف ⚠️", "error");
        }

        onSave({
            ...record,
            lines_data: finalLinesToSave,
            // نرسل الإجماليات الشاملة لتسجيلها في الداتابيز والقيود
            quantity: 1, 
            unit_price: finalSubtotal,
            vat_amount: finalVat,
            discount_amount: finalDiscount
        });
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen {
                    position: fixed !important; inset: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    background: radial-gradient(circle at center, rgba(40, 24, 10, 0.4) 0%, rgba(15, 7, 0, 0.9) 100%) !important;
                    backdrop-filter: blur(20px) !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    z-index: 999999999 !important;
                }
                .glass-input-field {
                    width: 100%; padding: 12px; border-radius: 12px;
                    background: rgba(255, 255, 255, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    outline: none; transition: 0.2s; font-weight: 700; color: #1e293b;
                }
                .glass-input-field:focus { background: #fff; border-color: ${THEME.accent}; box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15); }
                
                .btn-glass-save { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); }
                .btn-glass-cancel { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; }
                .btn-glass-cancel:hover { background: rgba(255, 255, 255, 0.9); transform: translateY(-2px); }
                
                .lines-table-container {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.7);
                    overflow: hidden; margin-top: 15px;
                }
                .item-row { transition: 0.2s; border-bottom: 1px solid rgba(0,0,0,0.05); }
                .item-row:hover { background: rgba(255, 255, 255, 0.8); }
            `}</style>

            <div className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: '1000px', maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.9)', 
                backdropFilter: 'blur(30px)', borderRadius: '35px', padding: '40px', 
                boxShadow: '0 40px 80px rgba(0,0,0,0.4)', overflowY: 'auto', direction: 'rtl'
            }}>
                
                {/* 📝 الهيدر */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:`2px solid ${THEME.accent}50`, paddingBottom:'15px'}}>
                    <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0, fontSize: '26px' }}>📝 {record?.id ? 'تعديل المصروف' : 'إنشاء مصروف جديد'}</h2>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 900 }}>الصافي النهائي</div>
                        <div style={{ color: THEME.accent, fontWeight: 900, fontSize: '28px' }}>{formatCurrency(finalTotal)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: isDistributionEnabled ? '#f3e8ff' : '#f8fafc', padding: '20px', borderRadius: '20px', border: `2px dashed ${isDistributionEnabled ? THEME.purple : '#cbd5e1'}`, marginBottom: '25px', transition: '0.3s' }}>
                    <input type="checkbox" id="distToggle" checked={isDistributionEnabled} onChange={(e) => setIsDistributionEnabled(e.target.checked)} style={{ width: '25px', height: '25px', accentColor: THEME.purple, cursor: 'pointer' }} />
                    <label htmlFor="distToggle" style={{ fontWeight: 900, color: isDistributionEnabled ? THEME.purple : '#64748b', cursor: 'pointer', fontSize: '16px' }}>✂️ تفعيل التوزيع التلقائي على مشاريع اليوم (حسب العمالة)</label>
                </div>

                <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'block', marginBottom: '6px' }}>📅 تاريخ المصروف *</label>
                        <input type="date" className="glass-input-field" value={record?.exp_date || ''} onChange={e => setRecord({...record, exp_date: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: 'span 2', zIndex: 90, position: 'relative' }}>
                        <SmartCombo label="🏢 المشروع / العقار" icon="🏢" table="projects" displayCol="Property" disabled={isDistributionEnabled} initialDisplay={isDistributionEnabled ? "سيتم التوزيع آلياً..." : record?.site_ref} onSelect={(val:any) => setRecord({...record, site_ref: val.Property})} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                    <div style={{ zIndex: 80, position: 'relative' }}>
                        <SmartCombo label="👷 المقاول / المورد" icon="👤" table="partners" displayCol="name" initialDisplay={record?.sub_contractor} onSelect={(val:any) => setRecord({...record, sub_contractor: val.name})} allowAddNew={true} />
                    </div>
                    <div style={{ zIndex: 70, position: 'relative' }}>
                        <SmartCombo label="👤 المستفيد المباشر" icon="👤" table="partners" displayCol="name" initialDisplay={record?.payee_name} onSelect={(val:any) => setRecord({...record, payee_name: val.name})} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', background: '#f8fafc', padding: '25px', borderRadius: '20px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                    <div style={{ zIndex: 60, position: 'relative' }}>
                        <SmartCombo label="🧾 حساب المصروف (المدين) *" icon="💳" table="accounts" displayCol="name" initialDisplay={record?.creditor_account} onSelect={(val:any) => setRecord({...record, creditor_account: val.name})} strict={true} />
                    </div>
                    <div style={{ zIndex: 50, position: 'relative' }}>
                        <SmartCombo label="🏦 حساب السداد (الدائن) *" icon="🏦" table="accounts" displayCol="name" initialDisplay={record?.payment_account} onSelect={(val:any) => setRecord({...record, payment_account: val.name})} strict={true} />
                    </div>
                </div>
                
                {/* 🚀 قسم إدخال الأصناف (مطابق للفواتير تماماً) */}
                <div style={{ background: 'rgba(202, 138, 4, 0.05)', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: `1px dashed ${THEME.accent}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: THEME.brand.coffee }}>🛒 إضافة بنود المصروف</h3>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.5fr', gap: '15px', alignItems: 'end' }}>
                        <div style={{ zIndex: 40 }}>
                            <SmartCombo label="البيان / الصنف *" icon="🛠️" freeText={true} initialDisplay={record.description} onSelect={(val: any) => setRecord({...record, description: typeof val === 'object' ? val.name : val})} options={historicalData?.descriptions || []} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 900, color: THEME.primary }}>الكمية *</label>
                            <input type="number" value={record.quantity || ''} onChange={e => setRecord({...record, quantity: e.target.value})} className="glass-input-field" style={{ textAlign: 'center' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 900, color: THEME.primary }}>سعر الوحدة *</label>
                            <input type="number" value={record.unit_price || ''} onChange={e => setRecord({...record, unit_price: e.target.value})} className="glass-input-field" style={{ textAlign: 'center' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 900, color: THEME.primary }}>قيمة الضريبة</label>
                            <input type="number" value={record.vat_amount || ''} onChange={e => setRecord({...record, vat_amount: e.target.value})} className="glass-input-field" style={{ textAlign: 'center' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 900, color: THEME.ruby }}>الخصم (-)</label>
                            <input type="number" value={record.discount_amount || ''} onChange={e => setRecord({...record, discount_amount: e.target.value})} className="glass-input-field" style={{ border: `1px solid ${THEME.ruby}50`, color: THEME.ruby, textAlign: 'center' }}/>
                        </div>
                        <button onClick={handleAddStatement} style={{ background: THEME.accent, color: 'white', border: 'none', height: '45px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, fontSize: '18px' }} title="إدراج في الجدول">➕</button>
                    </div>

                    {/* 📊 جدول عرض البنود المضافة */}
                    {addedLines.length > 0 && (
                        <div className="lines-table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                <thead style={{ background: THEME.primary, color: 'white' }}>
                                    <tr>
                                        <th style={{ padding: '12px', fontSize: '11px', textAlign: 'right' }}>البيان</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>الكمية</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>السعر</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>الضريبة</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>الخصم</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>الإجمالي</th>
                                        <th style={{ padding: '12px', fontSize: '11px' }}>حذف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addedLines.map((line: any, idx: number) => (
                                        <tr key={idx} className="item-row">
                                            <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{line.description}</td>
                                            <td style={{ padding: '12px', fontWeight: 800 }}>{line.quantity}</td>
                                            <td style={{ padding: '12px', fontWeight: 700 }}>{formatCurrency(line.unit_price)}</td>
                                            <td style={{ padding: '12px', fontWeight: 700 }}>{formatCurrency(line.vat_amount)}</td>
                                            <td style={{ padding: '12px', fontWeight: 700, color: THEME.ruby }}>{formatCurrency(line.discount_amount)}</td>
                                            <td style={{ padding: '12px', fontWeight: 900, color: THEME.primary }}>{formatCurrency(line.total_price)}</td>
                                            <td style={{ padding: '12px' }}>
                                                <button onClick={() => handleRemoveLine(idx)} style={{ background: 'none', border: 'none', color: THEME.ruby, cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 📂 المرفقات */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '18px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', color: '#475569', transition: '0.2s' }}>📁 إرفاق مستند (صورة / PDF)</button>
                    <button onClick={isCameraOpen ? takePhoto : startCamera} style={{ flex: 1, padding: '18px', background: '#1e293b', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isCameraOpen ? '📸 التقاط الفاتورة' : '📷 مسح بالكاميرا'}</button>
                </div>
                {isCameraOpen && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '20px', marginBottom: '20px', border: `4px solid ${THEME.accent}` }} />}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <input type="file" ref={fileInputRef} hidden accept="image/*,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(file); } }} />

                {/* 🚀 الملخص المالي السفلي */}
                <div className="responsive-summary-grid" style={{ marginTop: '30px', padding: '25px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الأصناف</div>
                        <div style={{ fontSize: '20px', fontWeight: 900 }}>{formatCurrency(finalSubtotal)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الضريبة</div>
                        <div style={{ fontSize: '20px', fontWeight: 900 }}>{formatCurrency(finalVat)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>إجمالي الخصم</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: THEME.ruby }}>{formatCurrency(finalDiscount)}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${THEME.accent}40, transparent)`, padding: '15px', borderRadius: '16px', border: `1px solid ${THEME.accent}80`, boxShadow: `0 0 20px ${THEME.accent}20` }}>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: THEME.accentLight }}>الصافي النهائي</div>
                        <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(finalTotal)}</div>
                    </div>
                </div>

                <div className="responsive-actions" style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
                    {isDistributionEnabled ? (
                        <button onClick={calculateDistribution} disabled={isSaving} className="btn-glass-save" style={{ flex: 2, background: THEME.purple }}>
                            ✂️ معاينة التوزيع قبل الحفظ
                        </button>
                    ) : (
                        <button onClick={handleValidateAndSave} disabled={isSaving} className="btn-glass-save" style={{ flex: 2 }}>
                            {isSaving ? '⏳ جاري الحفظ والترحيل...' : '✅ حفظ واعتماد المصروف'}
                        </button>
                    )}
                    <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>إغلاق وإلغاء</button>
                </div>
            </div>
        </div>,
        document.body
    );
}