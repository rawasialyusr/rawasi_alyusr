[
  {
    "function_name": "get_labor_calculations",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        site_ref AS \"الموقع\",\r\n        work_item AS \"البند_الرسمي\",\r\n        SUM(daily_wage) AS \"إجمالي_التكلفة\",\r\n        SUM(attendance_value) AS \"إجمالي_أيام_الحضور\",\r\n        COUNT(id) AS \"عدد_العمال\",\r\n        -- تجميع نصوص الإنتاجية في سطر واحد عشان تقرأها بسهولة\r\n        STRING_AGG(DISTINCT production_desc, ' | ') AS \"تفاصيل_الإنتاجية\"\r\n    FROM \r\n        public.labor_daily_logs\r\n    WHERE \r\n        -- السطر ده معناه: لو المبرمج مبعتش الفلتر، اعتبره \"الكل\"، لو بعته، فلتر بيه\r\n        (p_site_ref IS NULL OR site_ref = p_site_ref)\r\n        AND (p_work_date IS NULL OR work_date = p_work_date)\r\n        AND (p_work_item IS NULL OR work_item = p_work_item)\r\n    GROUP BY \r\n        site_ref, \r\n        work_item\r\n    ORDER BY \r\n        \"إجمالي_التكلفة\" DESC;\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_actual_quantity",
    "function_code": "\r\nBEGIN\r\n    -- 🟢 أ: في حالة الإضافة (INSERT) أو التعديل (UPDATE)\r\n    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN\r\n        IF NEW.project_id IS NOT NULL AND NEW.work_item_id IS NOT NULL THEN\r\n            UPDATE public.boq_budget\r\n            SET \r\n                -- 🚀 تحديث الكمية المنجزة فعلياً مباشرة بعد أن أصبح العمود numeric\r\n                actual_quantity = (\r\n                    SELECT COALESCE(SUM(productivity), 0)\r\n                    FROM public.labor_daily_logs\r\n                    WHERE project_id = NEW.project_id AND work_item_id = NEW.work_item_id\r\n                ),\r\n                -- 🚀 تحديث تكلفة أجور العمالة الفعلية تلقائياً من واقع اليوميات\r\n                actual_labor_cost = (\r\n                    SELECT COALESCE(SUM(daily_wage), 0)\r\n                    FROM public.labor_daily_logs\r\n                    WHERE project_id = NEW.project_id AND work_item_id = NEW.work_item_id\r\n                )\r\n            WHERE project_id = NEW.project_id AND boq_item_id = NEW.work_item_id;\r\n        END IF;\r\n    END IF;\r\n\r\n    -- 🔴 ب: في حالة الحذف (DELETE) أو نقل السجل لبند/فيلا أخرى\r\n    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN\r\n        IF OLD.project_id IS NOT NULL AND OLD.work_item_id IS NOT NULL THEN\r\n            -- لا يشتغل إلا لو كانت عملية حذف، أو تعديل غيّر المشروع أو البند فعلياً\r\n            IF (TG_OP = 'DELETE' OR OLD.project_id != NEW.project_id OR OLD.work_item_id != NEW.work_item_id) THEN\r\n                UPDATE public.boq_budget\r\n                SET \r\n                    -- 🚀 تحديث الكمية المنجزة فعلياً للبند القديم\r\n                    actual_quantity = (\r\n                        SELECT COALESCE(SUM(productivity), 0)\r\n                        FROM public.labor_daily_logs\r\n                        WHERE project_id = OLD.project_id AND work_item_id = OLD.work_item_id\r\n                    ),\r\n                    -- 🚀 إعادة حساب وتنظيف أجور العمالة للبند القديم\r\n                    actual_labor_cost = (\r\n                        SELECT COALESCE(SUM(daily_wage), 0)\r\n                        FROM public.labor_daily_logs\r\n                        WHERE project_id = OLD.project_id AND work_item_id = OLD.work_item_id\r\n                    )\r\n                WHERE project_id = OLD.project_id AND boq_item_id = OLD.work_item_id;\r\n            END IF;\r\n        END IF;\r\n    END IF;\r\n\r\n    IF (TG_OP = 'DELETE') THEN\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_lock_invoice_deductions",
    "function_code": "\r\nBEGIN\r\n    -- 1. قفل الخامات (للمشروع المحدد فقط)\r\n    UPDATE material_issues \r\n    SET claim_id = p_invoice_id\r\n    WHERE subcontractor_id = p_sub_id \r\n      AND project_id = p_proj_id\r\n      AND is_posted = true\r\n      AND claim_id IS NULL;\r\n\r\n    -- 2. قفل المصروفات (المطابقة للمشروع + المصروفات العامة بدون مشروع)\r\n    UPDATE expenses \r\n    SET claim_id = p_invoice_id\r\n    WHERE payee_id = p_sub_id \r\n      AND (project_id = p_proj_id OR project_id IS NULL)\r\n      AND is_posted = true\r\n      AND is_deducted_from_contractor = true\r\n      AND claim_id IS NULL;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_post_invoices",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_header_id UUID;\r\nBEGIN\r\n    FOR v_record IN \r\n        SELECT * FROM invoices WHERE id = ANY(p_ids) AND status != 'مُعتمد'\r\n    LOOP\r\n        -- 1️⃣ إنشاء رأس القيد (Journal Header)\r\n        INSERT INTO journal_headers (\r\n            entry_date, \r\n            description, \r\n            reference_id, \r\n            v_type, \r\n            status\r\n        ) VALUES (\r\n            v_record.date, \r\n            'ترحيل فاتورة مبيعات رقم: ' || v_record.invoice_number, \r\n            v_record.id, \r\n            'فاتورة مبيعات', \r\n            'posted'\r\n        ) RETURNING id INTO v_header_id;\r\n\r\n        -- 2️⃣ سطر مديونية العميل بالصافي المستحق\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (\r\n            v_header_id, \r\n            v_record.debit_account_id, \r\n            v_record.total_amount, \r\n            0, \r\n            v_record.partner_id, \r\n            'استحقاق الفاتورة (صافي القيمة)'\r\n        );\r\n\r\n        -- 3️⃣ سطر محتجز ضمان الأعمال\r\n        IF COALESCE(v_record.guarantee_amount, 0) > 0 THEN\r\n            INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n            VALUES (\r\n                v_header_id, \r\n                v_record.guarantee_acc_id, \r\n                v_record.guarantee_amount, \r\n                0, \r\n                v_record.partner_id, \r\n                'محتجز ضمان أعمال مسترد'\r\n            );\r\n        END IF;\r\n\r\n        -- 4️⃣ سطر خصم المواد 🚀\r\n        IF COALESCE(v_record.materials_discount, 0) > 0 THEN\r\n            INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n            VALUES (\r\n                v_header_id, \r\n                v_record.materials_acc_id, \r\n                v_record.materials_discount, \r\n                0, \r\n                NULL, \r\n                'خصم مواد من الفاتورة'\r\n            );\r\n        END IF;\r\n\r\n        -- 5️⃣ سطر الإيرادات بإجمالي الأعمال قبل خصم المواد 🚀\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (\r\n            v_header_id, \r\n            v_record.credit_account_id, \r\n            0, \r\n            (v_record.taxable_amount + COALESCE(v_record.materials_discount, 0)), \r\n            NULL, \r\n            'إيرادات مبيعات/مستخلصات'\r\n        );\r\n\r\n        -- 6️⃣ سطر الضريبة\r\n        IF COALESCE(v_record.tax_amount, 0) > 0 THEN\r\n            INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n            VALUES (\r\n                v_header_id, \r\n                v_record.tax_acc_id, \r\n                0, \r\n                v_record.tax_amount, \r\n                NULL, \r\n                'ضريبة قيمة مضافة مبيعات'\r\n            );\r\n        END IF;\r\n\r\n        -- تحديث حالة الفاتورة\r\n        UPDATE invoices SET status = 'مُعتمد' WHERE id = v_record.id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "get_table_dependencies",
    "function_code": "\r\nBEGIN\r\n    -- 1. كشف قيود الربط (Foreign Keys) الصادرة والواردة\r\n    RETURN QUERY\r\n    SELECT \r\n        'قيد ربط (Foreign Key)'::text,\r\n        c.conname::text,\r\n        (CASE \r\n            WHEN fk.relname = p_table_name THEN '⚠️ هذا الجدول يعتمد على جدول: ' || pk.relname\r\n            ELSE '🛡️ جدول [' || fk.relname || '] يعتمد على هذا الجدول'\r\n         END)::text\r\n    FROM pg_constraint c\r\n    JOIN pg_class fk ON c.conrelid = fk.oid\r\n    LEFT JOIN pg_class pk ON c.confrelid = pk.oid\r\n    WHERE c.contype = 'f' AND (fk.relname = p_table_name OR pk.relname = p_table_name);\r\n\r\n    -- 2. كشف المشغلات (Triggers) المربوطة بالجدول\r\n    RETURN QUERY\r\n    SELECT \r\n        'مُشغّل (Trigger)'::text,\r\n        t.tgname::text,\r\n        ('⚙️ يقوم بتشغيل الدالة الحية: ' || p.proname)::text\r\n    FROM pg_trigger t\r\n    JOIN pg_class c ON t.tgrelid = c.oid\r\n    JOIN pg_proc p ON t.tgfoid = p.oid\r\n    WHERE c.relname = p_table_name AND NOT t.tgisinternal;\r\n\r\n    -- 3. كشف شاشات العرض والتقارير (Views) التي تقرأ من هذا الجدول\r\n    RETURN QUERY\r\n    SELECT DISTINCT\r\n        'تقرير / عرض (View)'::text,\r\n        c.relname::text,\r\n        '📊 شاشة أو تقرير يعتمد مباشرة على بيانات هذا الجدول'::text\r\n    FROM pg_depend d\r\n    JOIN pg_rewrite r ON d.objid = r.oid\r\n    JOIN pg_class c ON r.ev_class = c.oid\r\n    WHERE d.refobjid = to_regclass('public.' || p_table_name)\r\n      AND c.relname <> p_table_name;\r\n      \r\nEND;\r\n"
  },
  {
    "function_name": "handle_receipt_voucher_cash_flow",
    "function_code": "\r\nDECLARE\r\n    v_project_id uuid := NULL;\r\nBEGIN\r\n    IF TG_OP = 'DELETE' THEN\r\n        DELETE FROM public.cash_flows WHERE source_id = OLD.id AND source_type = 'receipt_voucher';\r\n        RETURN OLD;\r\n    END IF;\r\n\r\n    -- 🛡️ حماية: تجاهل السندات التي قيمتها صفر أو أقل\r\n    IF NEW.amount <= 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n\r\n    IF NEW.project_ids IS NOT NULL AND array_length(NEW.project_ids, 1) > 0 THEN\r\n        v_project_id := NEW.project_ids[1];\r\n    END IF;\r\n\r\n    IF EXISTS (SELECT 1 FROM public.cash_flows WHERE source_id = NEW.id AND source_type = 'receipt_voucher') THEN\r\n        UPDATE public.cash_flows SET\r\n            transaction_date = NEW.date, amount = NEW.amount, payment_method = NEW.payment_method,\r\n            reference_number = COALESCE(NEW.reference_number, NEW.receipt_number), description = NEW.notes,\r\n            account_id = NEW.safe_bank_acc_id, project_id = v_project_id, partner_id = NEW.partner_id\r\n        WHERE source_id = NEW.id AND source_type = 'receipt_voucher';\r\n    ELSE\r\n        INSERT INTO public.cash_flows (\r\n            transaction_date, flow_type, amount, category, sub_category, payment_method, \r\n            reference_number, description, account_id, project_id, partner_id, source_id, source_type\r\n        ) VALUES (\r\n            NEW.date, 'inflow', NEW.amount, 'أنشطة تشغيلية', 'تحصيل بموجب سند قبض رقم: ' || COALESCE(NEW.receipt_number, ''), \r\n            NEW.payment_method, COALESCE(NEW.reference_number, NEW.receipt_number), NEW.notes, \r\n            NEW.safe_bank_acc_id, v_project_id, NEW.partner_id, NEW.id, 'receipt_voucher'\r\n        );\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "auto_bind_payee_id_from_subcontractor",
    "function_code": "\r\nBEGIN\r\n    -- التحقق من أن خانة اسم المقاول مكتوب فيها نص وليس فارغة\r\n    IF NEW.sub_contractor IS NOT NULL AND NEW.sub_contractor <> '' THEN\r\n        -- البحث عن الـ ID المطابق للاسم من جدول الـ partners\r\n        SELECT id INTO NEW.payee_id\r\n        FROM public.partners\r\n        WHERE TRIM(BOTH FROM name) = TRIM(BOTH FROM NEW.sub_contractor)\r\n        LIMIT 1;\r\n        \r\n        -- ميزة أمان إضافية: لو الاسم مكتوب بس ملوش سجل في البارتنر، سيب الـ payee_id زي ما هو\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "get_project_full_details",
    "function_code": "\r\nDECLARE\r\n    v_boq json;\r\n    v_expenses json;\r\n    v_materials json;\r\n    v_invoices json;\r\n    v_sub_claims json;\r\n    v_contractor_assignments json;\r\nBEGIN\r\n    -- 1. بنود المقايسة\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_boq\r\n    FROM (SELECT * FROM public.boq_budget WHERE project_id = p_project_id) t;\r\n\r\n    -- 2. المصاريف واليوميات\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_expenses\r\n    FROM (SELECT * FROM public.expenses WHERE project_id = p_project_id) t;\r\n\r\n    -- 3. تجميع الخامات المصلح والمؤمن بالكامل بدون l.boq_id المكسور\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_materials\r\n    FROM (\r\n        -- حركات التوريد (تستخدم boq_item_id)\r\n        SELECT id, item_name, quantity, unit, unit_price, total_price, boq_item_id AS boq_id, 'receipt' AS movement_type \r\n        FROM public.material_receipt_lines \r\n        WHERE project_id = p_project_id\r\n        UNION ALL\r\n        -- حركات الصرف (تستخدم boq_id)\r\n        SELECT mil.id, mil.item_name, mil.quantity, mil.unit, mil.unit_price, mil.total_price, mil.boq_id, 'issue' AS movement_type \r\n        FROM public.material_issue_lines mil\r\n        JOIN public.material_issues mi ON mil.issue_id = mi.id\r\n        WHERE mi.project_id = p_project_id\r\n    ) t;\r\n\r\n    -- 4. الفواتير والمستخلصات\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_invoices\r\n    FROM (SELECT * FROM public.invoices WHERE project_ids @> array[p_project_id]) t;\r\n\r\n    -- 5. مستخلصات مقاولي الباطن\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_sub_claims\r\n    FROM (SELECT * FROM public.sub_claims WHERE project_id = p_project_id) t;\r\n\r\n    -- 6. تكليفات المقاولين\r\n    SELECT COALESCE(json_agg(t), '[]'::json) INTO v_contractor_assignments\r\n    FROM (SELECT * FROM public.contractor_assignments WHERE project_id = p_project_id) t;\r\n\r\n    -- إرجاع الداتا كاملة كـ Object مدمج\r\n    RETURN json_build_object(\r\n        'boq', v_boq,\r\n        'expenses', v_expenses,\r\n        'materials', v_materials,\r\n        'invoices', v_invoices,\r\n        'sub_claims', v_sub_claims,\r\n        'contractor_assignments', v_contractor_assignments\r\n    );\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_unpost_invoices",
    "function_code": "\r\nDECLARE\r\n    v_receipt_ids UUID[];\r\nBEGIN\r\n    -- 1️⃣ تجميع أرقام معرفات (IDs) كل سندات القبض المرتبطة بالفواتير دي\r\n    SELECT array_agg(id) INTO v_receipt_ids \r\n    FROM receipt_vouchers \r\n    WHERE invoice_id = ANY(p_ids);\r\n\r\n    -- 2️⃣ مسح قيود اليومية المرتبطة بسندات القبض (مع الحماية من الـ NULL)\r\n    IF COALESCE(array_length(v_receipt_ids, 1), 0) > 0 THEN\r\n        DELETE FROM journal_headers \r\n        WHERE reference_id = ANY(v_receipt_ids);\r\n        \r\n        DELETE FROM receipt_vouchers \r\n        WHERE id = ANY(v_receipt_ids);\r\n    END IF;\r\n\r\n    -- 3️⃣ مسح قيود اليومية المرتبطة بالفواتير نفسها\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- 4️⃣ تصفير ميزان الفاتورة وإرجاع حالتها\r\n    UPDATE invoices \r\n    SET \r\n        status = 'معلق',\r\n        paid_amount = 0  \r\n    WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "post_expenses_bulk",
    "function_code": "\r\nDECLARE\r\n    exp RECORD;\r\n    v_header_id uuid;\r\n    v_total numeric;\r\n    v_debit_acc_id uuid;\r\n    v_credit_acc_id uuid;\r\n    v_code_debit text;\r\n    v_code_credit text;\r\nBEGIN\r\n    FOR exp IN SELECT * FROM public.expenses WHERE id = ANY(p_ids) AND (is_posted = false OR is_posted IS NULL) LOOP\r\n        \r\n        v_debit_acc_id := NULL;\r\n        v_credit_acc_id := NULL;\r\n\r\n        -- 1. حساب الإجمالي\r\n        v_total := COALESCE((exp.quantity * exp.unit_price), 0) + COALESCE(exp.vat_amount, 0) - COALESCE(exp.discount_amount, 0);\r\n\r\n        -- 🚀 2. الحل السحري: تخطي القيود الصفرية (عينات مجانية / بونص)\r\n        IF v_total <= 0 THEN\r\n            UPDATE public.expenses SET is_posted = true WHERE id = exp.id;\r\n            CONTINUE; -- تخطى إنشاء القيد المحاسبي وانتقل للسجل التالي فوراً\r\n        END IF;\r\n\r\n        -- 3. استخراج الأكواد\r\n        v_code_debit := split_part(exp.creditor_account, ' - ', 1);\r\n        v_code_credit := split_part(exp.payment_account, ' - ', 1);\r\n\r\n        -- 4. البحث عن حساب المدين والتحقق الصارم\r\n        SELECT id INTO v_debit_acc_id FROM public.accounts WHERE code::text = v_code_debit LIMIT 1;\r\n        IF v_debit_acc_id IS NULL THEN\r\n            SELECT id INTO v_debit_acc_id FROM public.accounts WHERE name = exp.creditor_account LIMIT 1;\r\n        END IF;\r\n        IF v_debit_acc_id IS NULL THEN\r\n            RAISE EXCEPTION 'خطأ في الترحيل: لم يتم العثور على حساب المدين (%) للمصروف: %', exp.creditor_account, exp.description;\r\n        END IF;\r\n\r\n        -- 5. البحث عن حساب الدائن والتحقق الصارم\r\n        SELECT id INTO v_credit_acc_id FROM public.accounts WHERE code::text = v_code_credit LIMIT 1;\r\n        IF v_credit_acc_id IS NULL THEN\r\n            SELECT id INTO v_credit_acc_id FROM public.accounts WHERE name = exp.payment_account LIMIT 1;\r\n        END IF;\r\n        IF v_credit_acc_id IS NULL THEN\r\n            RAISE EXCEPTION 'خطأ في الترحيل: لم يتم العثور على حساب الدائن (%) للمصروف: %', exp.payment_account, exp.description;\r\n        END IF;\r\n\r\n        -- 6. إنشاء رأس القيد\r\n        INSERT INTO public.journal_headers (reference_id, entry_date, description, status, v_type)\r\n        VALUES (exp.id, exp.exp_date::date, COALESCE(exp.description, 'قيد مصروف معتمد'), 'posted', 'expense')\r\n        RETURNING id INTO v_header_id;\r\n\r\n        -- 7. سطر المدين \r\n        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id)\r\n        VALUES (v_header_id, v_debit_acc_id, v_total, 0, exp.payee_id);\r\n\r\n        -- 8. سطر الدائن \r\n        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id)\r\n        VALUES (v_header_id, v_credit_acc_id, 0, v_total, NULL);\r\n\r\n        -- 9. تحديث حالة المصروف\r\n        UPDATE public.expenses SET is_posted = true WHERE id = exp.id;\r\n        \r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "set_villa_name_auto",
    "function_code": "\r\nBEGIN\r\n    -- إذا تم إدخال أو تعديل مشروع، اسحب بياناته\r\n    IF NEW.project_id IS NOT NULL THEN\r\n        SELECT \"Property\", project_code \r\n        INTO NEW.villa_name, NEW.villa_number \r\n        FROM public.projects \r\n        WHERE id = NEW.project_id;\r\n    ELSE\r\n        NEW.villa_name := NULL;\r\n        NEW.villa_number := NULL;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "post_payment_vouchers_bulk",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\n    v_header_id uuid;\r\n    v_full_description TEXT;\r\nBEGIN\r\n    FOR v_rec IN \r\n        SELECT * FROM public.payment_vouchers \r\n        WHERE id = ANY(p_ids) AND (is_posted = false OR is_posted IS NULL) \r\n    LOOP\r\n        \r\n        -- 1️⃣ بناء البيان المدمج: (رقم السند + رقم الفاتورة/المرجع + بيان السند)\r\n        v_full_description := 'سند صرف رقم: ' || v_rec.voucher_number;\r\n        \r\n        -- استخدام reference_no (والذي يمثل رقم فاتورة المورد أو المرجع)\r\n        IF v_rec.reference_no IS NOT NULL AND TRIM(v_rec.reference_no) <> '' THEN\r\n            v_full_description := v_full_description || ' - فاتورة/مرجع: ' || v_rec.reference_no;\r\n        END IF;\r\n\r\n        -- إضافة وصف السند الأصلي\r\n        IF v_rec.description IS NOT NULL AND TRIM(v_rec.description) <> '' THEN\r\n            v_full_description := v_full_description || ' - بيان: ' || v_rec.description;\r\n        END IF;\r\n\r\n        -- 2️⃣ إنشاء رأس القيد بالبيان الجديد المدمج\r\n        INSERT INTO public.journal_headers (reference_id, entry_date, description, v_type, status)\r\n        VALUES (v_rec.id, v_rec.date, v_full_description, 'payment_vouchers', 'posted')\r\n        RETURNING id INTO v_header_id;\r\n\r\n        -- 3️⃣ سطر المدين (المستفيد): بياخد الـ partner_id والبيان الجديد\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)\r\n        VALUES (v_header_id, v_rec.debit_account_id, v_rec.partner_id, v_rec.amount, 0, v_full_description);\r\n\r\n        -- 4️⃣ سطر الدائن (الخزنة/البنك): الـ partner_id يكون NULL والبيان الجديد\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)\r\n        VALUES (v_header_id, v_rec.credit_account_id, NULL, 0, v_rec.amount, v_full_description);\r\n\r\n        -- 5️⃣ تحديث حالة السند لمرحل\r\n        UPDATE public.payment_vouchers SET is_posted = true, status = 'مرحل' WHERE id = v_rec.id;\r\n        \r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "get_accounts_report_with_lines",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    WITH RECURSIVE account_tree AS (\r\n        SELECT \r\n            a.id, a.parent_id,\r\n            COALESCE(SUM(jl.debit), 0) AS t_debit,\r\n            COALESCE(SUM(jl.credit), 0) AS t_credit,\r\n            (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)) AS bal\r\n        FROM public.accounts a\r\n        LEFT JOIN public.journal_lines jl ON a.id = jl.account_id\r\n        LEFT JOIN public.journal_headers jh ON jl.header_id = jh.id \r\n            AND jh.status = 'posted' \r\n            AND jh.entry_date >= p_date_from \r\n            AND jh.entry_date <= p_date_to\r\n        GROUP BY a.id\r\n\r\n        UNION ALL\r\n\r\n        SELECT \r\n            parent.id, parent.parent_id, child.t_debit, child.t_credit, child.bal\r\n        FROM public.accounts parent\r\n        JOIN account_tree child ON child.parent_id = parent.id\r\n    ),\r\n    aggregated_balances AS (\r\n        SELECT \r\n            at.id, SUM(at.t_debit) AS total_debit, SUM(at.t_credit) AS total_credit, SUM(at.bal) AS balance\r\n        FROM account_tree at\r\n        GROUP BY at.id\r\n    ),\r\n    account_transactions AS (\r\n        SELECT \r\n            a.id AS acc_id,\r\n            COALESCE(\r\n                jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'id', jl.id,\r\n                        'date', jh.entry_date,\r\n                        'description', COALESCE(jh.description, ''),\r\n                        'notes', COALESCE(jl.notes, ''), -- 🚀 سحب ملاحظات السطر (محتجزات الضمان وغيرها)\r\n                        'partner_name', COALESCE(p.name, ''), -- 🚀 سحب اسم البارتنر\r\n                        'debit', jl.debit,\r\n                        'credit', jl.credit\r\n                    ) ORDER BY jh.entry_date DESC\r\n                ) FILTER (WHERE jl.id IS NOT NULL), \r\n                '[]'::jsonb\r\n            ) AS trans\r\n        FROM public.accounts a\r\n        LEFT JOIN public.journal_lines jl ON a.id = jl.account_id\r\n        LEFT JOIN public.journal_headers jh ON jl.header_id = jh.id \r\n            AND jh.status = 'posted' \r\n            AND jh.entry_date >= p_date_from \r\n            AND jh.entry_date <= p_date_to\r\n        LEFT JOIN public.partners p ON jl.partner_id = p.id -- 🚀 الربط مع جدول الشركاء\r\n        WHERE a.is_transactional = TRUE\r\n        GROUP BY a.id\r\n    )\r\n    SELECT \r\n        a.id, a.code, a.name, a.parent_id,\r\n        COALESCE(a.is_transactional, true) AS is_transactional,\r\n        a.account_type,\r\n        COALESCE(ab.total_debit, 0) AS total_debit,\r\n        COALESCE(ab.total_credit, 0) AS total_credit,\r\n        COALESCE(ab.balance, 0) AS balance,\r\n        COALESCE(atr.trans, '[]'::jsonb) AS transactions\r\n    FROM public.accounts a\r\n    LEFT JOIN aggregated_balances ab ON a.id = ab.id\r\n    LEFT JOIN account_transactions atr ON a.id = atr.acc_id;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_delete_invoices",
    "function_code": "\r\nBEGIN\r\n    -- 1. مسح قيود اليومية المرتبطة بالفواتير أولاً لتفادي مشاكل الربط (Foreign Keys)\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- 2. مسح الفواتير نفسها\r\n    DELETE FROM invoices \r\n    WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "maintain_material_issue_boq_id",
    "function_code": "\r\nDECLARE\r\n    v_project_id UUID;\r\n    v_boq_id UUID;\r\nBEGIN\r\n    -- 1) جلب الـ project_id (آيدي الفيلا) من الجدول الرئيسي material_issues بناءً على الـ issue_id الحالي\r\n    SELECT project_id INTO v_project_id\r\n    FROM public.material_issues\r\n    WHERE id = NEW.issue_id;\r\n\r\n    -- 2) التحقق من أن الفيلا والبند العام (boq_item_id) تم تحديدهم في السطر\r\n    IF v_project_id IS NOT NULL AND NEW.boq_item_id IS NOT NULL THEN\r\n        \r\n        -- 3) البحث في الميزانية عن السطر الذي يجمع نفس الفيلا ونفس البند العام\r\n        SELECT id INTO v_boq_id\r\n        FROM public.boq_budget\r\n        WHERE project_id = v_project_id\r\n          AND boq_item_id = NEW.boq_item_id\r\n        LIMIT 1;\r\n\r\n        -- 4) إذا وجدنا السطر المطابق، نقوم بربط الـ boq_id تلقائياً قبل الحفظ\r\n        IF v_boq_id IS NOT NULL THEN\r\n            NEW.boq_id := v_boq_id;\r\n        END IF;\r\n        \r\n    END IF;\r\n\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_labor_logs_bulk",
    "function_code": "\r\nBEGIN\r\n    -- أ. مسح سطور القيود المجمعة من الجورنال\r\n    DELETE FROM public.journal_lines \r\n    WHERE header_id IN (\r\n        SELECT id FROM public.journal_headers WHERE reference_id = ANY(record_ids) AND v_type = 'labor_daily_logs'\r\n    );\r\n\r\n    -- ب. مسح رؤوس القيود المجمعة من الجورنال بالكامل\r\n    DELETE FROM public.journal_headers \r\n    WHERE reference_id = ANY(record_ids) AND v_type = 'labor_daily_logs';\r\n\r\n    -- ج. تعليق اليوميات في جدول العمالة لتصبح مسودة\r\n    UPDATE public.labor_daily_logs\r\n    SET is_posted = false\r\n    WHERE id = ANY(record_ids);\r\n\r\n    -- تنشيط كاش الواجهة الأمامية\r\n    PERFORM pg_notify('pgrst', 'reload schema');\r\n    RETURN true;\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_violations_bulk_journal",
    "function_code": "\r\nDECLARE\r\n    v_id uuid;\r\nBEGIN\r\n    FOREACH v_id IN ARRAY violation_ids\r\n    LOOP\r\n        -- 1. مسح أي سطور تابعة للقيد الخاص بهذه المخالفة\r\n        DELETE FROM public.journal_lines WHERE header_id IN (SELECT id FROM public.journal_headers WHERE reference_id = v_id);\r\n        \r\n        -- 2. مسح رأس القيد نفسه\r\n        DELETE FROM public.journal_headers WHERE reference_id = v_id;\r\n        \r\n        -- 3. إرجاع المخالفة لحالة \"معلق\"\r\n        UPDATE public.violations SET is_posted = false WHERE id = v_id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "handle_expense_status_on_payment",
    "function_code": "\r\nBEGIN\r\n    -- في حالة إضافة سند جديد (INSERT)\r\n    IF TG_OP = 'INSERT' THEN\r\n        IF NEW.related_expense_id IS NOT NULL THEN\r\n            UPDATE public.expenses \r\n            SET paid_amount = COALESCE(paid_amount, 0) + COALESCE(NEW.amount, 0)\r\n            WHERE id = NEW.related_expense_id;\r\n        END IF;\r\n        RETURN NEW;\r\n        \r\n    -- في حالة حذف سند (DELETE)\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        IF OLD.related_expense_id IS NOT NULL THEN\r\n            UPDATE public.expenses \r\n            -- استخدام GREATEST عشان الرصيد مينزلش تحت الصفر بالغلط\r\n            SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - COALESCE(OLD.amount, 0), 0)\r\n            WHERE id = OLD.related_expense_id;\r\n        END IF;\r\n        RETURN OLD;\r\n        \r\n    -- في حالة تعديل مبلغ السند (UPDATE)\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- لو السند كان مربوط بفاتورة، ننقص المبلغ القديم الأول\r\n        IF OLD.related_expense_id IS NOT NULL THEN\r\n            UPDATE public.expenses \r\n            SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - COALESCE(OLD.amount, 0), 0)\r\n            WHERE id = OLD.related_expense_id;\r\n        END IF;\r\n        \r\n        -- وبعدين نضيف المبلغ الجديد للفاتورة الجديدة (أو نفس الفاتورة لو متعدلتش)\r\n        IF NEW.related_expense_id IS NOT NULL THEN\r\n            UPDATE public.expenses \r\n            SET paid_amount = COALESCE(paid_amount, 0) + COALESCE(NEW.amount, 0)\r\n            WHERE id = NEW.related_expense_id;\r\n        END IF;\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n"
  },
  {
    "function_name": "clean_blind_journal_lines",
    "function_code": "\r\nBEGIN\r\n    -- 1. مسح أي سطر أعمى (مدين ودائن = صفر أو NULL)\r\n    DELETE FROM public.journal_lines \r\n    WHERE COALESCE(debit, 0) = 0 \r\n      AND COALESCE(credit, 0) = 0;\r\n\r\n    -- 2. مسح رؤوس القيود اللي بقت فاضية (يتيمة) بعد مسح سطورها الصفرية\r\n    DELETE FROM public.journal_headers \r\n    WHERE id NOT IN (SELECT header_id FROM public.journal_lines);\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_unpost_material_receipt",
    "function_code": "\r\nDECLARE\r\n  v_jv UUID;\r\nBEGIN\r\n  -- 1. الحصول على رقم القيد المربوط\r\n  SELECT jv_id INTO v_jv FROM public.material_receipts WHERE id = p_id;\r\n  \r\n  -- 2. تصفير الربط في الفاتورة أولاً (لأمان قاعدة البيانات ومنع أخطاء Foreign Key)\r\n  UPDATE public.material_receipts \r\n  SET is_posted = false, jv_id = NULL \r\n  WHERE id = p_id;\r\n\r\n  -- 3. مسح القيد المحاسبي\r\n  IF v_jv IS NOT NULL THEN\r\n    DELETE FROM public.journal_lines WHERE header_id = v_jv;\r\n    DELETE FROM public.journal_headers WHERE id = v_jv;\r\n  END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "delete_invoices_bulk",
    "function_code": "\r\nBEGIN\r\n    -- مسح قيود اليومية أولاً\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- مسح الفاتورة\r\n    DELETE FROM invoices WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_post_material",
    "function_code": "\r\nDECLARE\r\n  v_receipt RECORD;\r\n  v_jv_id uuid;\r\n  \r\n  -- الحسابات الثابتة (تأكد من صحة الآيديهات في قاعدة بياناتك)\r\n  v_inventory_acc uuid := 'c5efa035-c8d5-4d13-bf33-7c7cd854f393'; -- [المدين]: مخزون الخامات\r\n  v_client_inventory_acc uuid := '85e61a6a-8c85-4219-a733-3b2180dfe043'; -- [الدائن]: المورد\r\nBEGIN\r\n  -- جلب بيانات السند\r\n  SELECT * INTO v_receipt FROM public.material_receipts WHERE id = p_id;\r\n  \r\n  IF v_receipt.is_posted THEN\r\n    RAISE EXCEPTION 'هذا السند مرحل محاسبياً بالفعل!';\r\n  END IF;\r\n\r\n  -- إنشاء رأس القيد\r\n  INSERT INTO public.journal_headers (\r\n    entry_date,   \r\n    reference_id,\r\n    description,\r\n    status,\r\n    v_type,\r\n    created_at\r\n  ) VALUES (\r\n    v_receipt.receipt_date, -- 🚀 متوافق مع السكيما\r\n    v_receipt.id,\r\n    'إثبات توريد خامات - فاتورة رقم: ' || v_receipt.receipt_number, -- 🚀 متوافق مع السكيما\r\n    'posted', \r\n    'inventory', \r\n    now()\r\n  ) RETURNING id INTO v_jv_id;\r\n\r\n  -- [Debit] الطرف المدين: المخزون\r\n  INSERT INTO public.journal_lines (\r\n    header_id, account_id, project_id, partner_id, debit, credit, notes         \r\n  ) VALUES (\r\n    v_jv_id, v_inventory_acc, v_receipt.project_id, NULL, \r\n    v_receipt.total_amount, -- 🚀 متوافق مع السكيما\r\n    0, 'دخول خامات للمخزن - فاتورة: ' || v_receipt.receipt_number\r\n  );\r\n\r\n  -- [Credit] الطرف الدائن: المورد\r\n  INSERT INTO public.journal_lines (\r\n    header_id, account_id, project_id, partner_id, debit, credit, notes         \r\n  ) VALUES (\r\n    v_jv_id, v_client_inventory_acc, v_receipt.project_id, v_receipt.supplier_id, \r\n    0, v_receipt.total_amount, -- 🚀 متوافق مع السكيما\r\n    'استحقاق توريد خامات للمشروع - فاتورة: ' || v_receipt.receipt_number\r\n  );\r\n\r\n  -- تحديث حالة السند وربطه بالقيد\r\n  UPDATE public.material_receipts \r\n  SET is_posted = true, jv_id = v_jv_id \r\n  WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "post_violations_bulk_v3",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\nBEGIN\r\n    -- اللف على المخالفات المحددة وغير المرحلة\r\n    FOR v_rec IN \r\n        SELECT * FROM public.violations WHERE id = ANY(violation_ids) AND is_posted = false\r\n    LOOP\r\n        -- 🚀 توليد سند صرف/تسوية (يؤثر على ذمة البارتنر)\r\n        INSERT INTO public.payment_vouchers (\r\n            voucher_number,\r\n            date,\r\n            amount,\r\n            partner_id,          -- 🎯 رمي المعرف في سطر الذمة\r\n            debit_account_id,    -- الحساب المدين من المخالفة\r\n            credit_account_id,   -- الحساب الدائن من المخالفة\r\n            description,\r\n            is_posted,\r\n            status,\r\n            related_violation_id -- المرجع للربط التسلسلي\r\n        ) VALUES (\r\n            'PV-VIOL-' || to_char(now(), 'YYMMDD') || '-' || substr(v_rec.id::text, 1, 4),\r\n            v_rec.date,\r\n            v_rec.amount,\r\n            v_rec.partner_id,    -- ربط البارتنر بالسند\r\n            v_rec.debit_account_id,\r\n            v_rec.credit_account_id,\r\n            'جزاء مخالفة: ' || COALESCE(v_rec.reason, v_rec.emp_name),\r\n            true,               -- ترحيل تلقائي\r\n            'مرحل',\r\n            v_rec.id\r\n        );\r\n\r\n        -- تحديث المخالفة إنها اتمرحلت\r\n        UPDATE public.violations SET is_posted = true WHERE id = v_rec.id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "save_expense_with_settlement",
    "function_code": "\r\nDECLARE\r\n    v_exp_id uuid;\r\n    v_total_amount numeric;\r\n    v_paid_amount numeric;\r\nBEGIN\r\n    -- حساب الإجمالي داخلياً لتحديد قيمة التسوية فقط (لن نرسله للعمود المحسوب)\r\n    v_total_amount := (p_quantity * p_unit_price) + p_vat_amount - p_discount_amount;\r\n\r\n    IF p_payment_method = 'تسوية داخلية' THEN\r\n        v_paid_amount := v_total_amount; \r\n    ELSE\r\n        v_paid_amount := 0;\r\n    END IF;\r\n\r\n    IF p_id IS NOT NULL THEN\r\n        UPDATE public.expenses SET\r\n            exp_date = p_exp_date, \r\n            main_category = p_main_category, \r\n            sub_contractor = p_sub_contractor,\r\n            site_ref = p_site_ref, \r\n            creditor_account = p_creditor_account, \r\n            description = p_description,\r\n            payee_name = p_payee_name, \r\n            payment_method = p_payment_method, \r\n            payment_account = p_payment_account,\r\n            employee_name = p_employee_name, \r\n            quantity = p_quantity, \r\n            unit_price = p_unit_price,\r\n            vat_amount = p_vat_amount, \r\n            discount_amount = p_discount_amount, \r\n            discount_account = p_discount_account,\r\n            -- ❌ تم إزالة total_price ليتم حسابه آلياً من قاعدة البيانات\r\n            notes = p_notes, \r\n            invoice_image = p_invoice_image, \r\n            lines_data = p_lines_data, \r\n            is_auto_distributed = p_is_auto_distributed,\r\n            paid_amount = v_paid_amount,\r\n            is_posted = false,\r\n            project_id = p_project_id,\r\n            payee_id = p_payee_id,\r\n            job_order_id = p_job_order_id,\r\n            is_deducted_from_contractor = p_is_deducted_from_contractor\r\n        WHERE id = p_id RETURNING id INTO v_exp_id;\r\n    ELSE\r\n        INSERT INTO public.expenses (\r\n            exp_date, main_category, sub_contractor, site_ref, creditor_account, description, payee_name, \r\n            payment_method, payment_account, employee_name, quantity, unit_price, vat_amount, \r\n            discount_amount, discount_account, notes, invoice_image, lines_data, is_auto_distributed, \r\n            paid_amount, is_posted, created_by, project_id, payee_id, job_order_id, is_deducted_from_contractor\r\n            -- ❌ تم إزالة total_price\r\n        ) VALUES (\r\n            p_exp_date, p_main_category, p_sub_contractor, p_site_ref, p_creditor_account, p_description, p_payee_name, \r\n            p_payment_method, p_payment_account, p_employee_name, p_quantity, p_unit_price, p_vat_amount, \r\n            p_discount_amount, p_discount_account, p_notes, p_invoice_image, p_lines_data, p_is_auto_distributed, \r\n            v_paid_amount, false, p_user_id, p_project_id, p_payee_id, p_job_order_id, p_is_deducted_from_contractor\r\n        ) RETURNING id INTO v_exp_id;\r\n    END IF;\r\n\r\n    RETURN json_build_object('success', true, 'id', v_exp_id);\r\nEXCEPTION WHEN OTHERS THEN\r\n    RETURN json_build_object('success', false, 'error', SQLERRM);\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_universal_bulk",
    "function_code": "\r\nDECLARE\r\n    v_voucher_ids uuid[];\r\nBEGIN\r\n    -- أ. إذا كان الجدول هو المصروفات (expenses)\r\n    IF p_table_name = 'expenses' THEN\r\n        -- 🔎 محاولة جلب السندات المرتبطة بالمصروفات المحددة\r\n        -- سنبحث في جدول السندات عن أي سجل يشير إلى معرف المصروف\r\n        SELECT array_agg(id) INTO v_voucher_ids \r\n        FROM payment_vouchers \r\n        WHERE reference_no = ANY(p_ids::text[]) -- البحث في المرجع (كـ نص)\r\n           OR description LIKE '%' || (SELECT id::text FROM expenses WHERE id = ANY(p_ids) LIMIT 1) || '%';\r\n\r\n        IF v_voucher_ids IS NOT NULL THEN\r\n            -- 1. مسح قيود اليومية المرتبطة بسندات الصرف\r\n            DELETE FROM journal_lines WHERE header_id IN (SELECT id FROM journal_headers WHERE reference_id = ANY(v_voucher_ids));\r\n            DELETE FROM journal_headers WHERE reference_id = ANY(v_voucher_ids);\r\n            \r\n            -- 2. مسح سندات الصرف نفسها\r\n            DELETE FROM payment_vouchers WHERE id = ANY(v_voucher_ids);\r\n        END IF;\r\n\r\n        -- 3. تصفير \"المبلغ المدفوع\" في جدول المصروفات ليعود السجل كأنه لم يصرف\r\n        UPDATE expenses SET paid_amount = 0 WHERE id = ANY(p_ids);\r\n    END IF;\r\n\r\n    -- ب. مسح قيود اليومية المرتبطة بالمصروفات نفسها (Journal Entry)\r\n    DELETE FROM journal_lines \r\n    WHERE header_id IN (\r\n        SELECT id FROM journal_headers WHERE reference_id = ANY(p_ids)\r\n    );\r\n\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- ج. تحديث حالة المصروفات إلى \"غير مرحل\" لتمكين التعديل عليها\r\n    EXECUTE format('UPDATE %I SET is_posted = false WHERE id = ANY($1)', p_table_name)\r\n    USING p_ids;\r\nEND;\r\n"
  },
  {
    "function_name": "bulk_disburse_expenses",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_voucher_no TEXT;\r\n    v_total NUMERIC;\r\n    v_lines_total NUMERIC;\r\n    v_debit_acc_id UUID;\r\n    v_main_treasury_id UUID := '21b8a1db-bc9f-4cf8-b741-1efeded0963c'; -- 🏦 الخزينة الرئيسية\r\n    v_counter INT := 1; -- 🚀 العداد الذي يمنع التكرار نهائياً\r\n    v_batch_id TEXT;\r\nBEGIN\r\n    -- توليد معرف للدفعة يعتمد على وقت السيرفر الفعلي\r\n    v_batch_id := to_char(clock_timestamp(), 'YYMMDDHH24MISS');\r\n\r\n    FOR v_record IN \r\n        SELECT * FROM expenses \r\n        WHERE id = ANY(p_expense_ids) \r\n    LOOP\r\n        -- 1️⃣ حساب إجمالي المصروف بدقة\r\n        SELECT SUM(COALESCE((line->>'total_price')::numeric, (line->>'quantity')::numeric * (line->>'unit_price')::numeric, 0))\r\n        INTO v_lines_total\r\n        FROM jsonb_array_elements(\r\n            CASE WHEN jsonb_typeof(v_record.lines_data) = 'array' THEN v_record.lines_data ELSE '[]'::jsonb END\r\n        ) AS line;\r\n\r\n        IF COALESCE(v_lines_total, 0) > 0 THEN\r\n            v_total := v_lines_total + COALESCE(v_record.vat_amount, 0) - COALESCE(v_record.discount_amount, 0);\r\n        ELSE\r\n            v_total := COALESCE(v_record.total_price, (v_record.quantity * v_record.unit_price)) + COALESCE(v_record.vat_amount, 0) - COALESCE(v_record.discount_amount, 0);\r\n        END IF;\r\n\r\n        -- 2️⃣ التخطي إذا كان المصروف مسدداً بالكامل\r\n        IF COALESCE(v_record.paid_amount, 0) >= v_total THEN\r\n            CONTINUE;\r\n        END IF;\r\n\r\n        -- 3️⃣ تحويل الحساب المدين (النصي) إلى UUID\r\n        SELECT id INTO v_debit_acc_id \r\n        FROM accounts \r\n        WHERE (code || ' - ' || name) = v_record.payment_account OR name = v_record.payment_account \r\n        LIMIT 1;\r\n\r\n        -- 4️⃣ 🚀 توليد رقم السند المنيع ضد التكرار (مثال: PV-240510143000-1)\r\n        v_voucher_no := 'PV-' || v_batch_id || '-' || v_counter::text;\r\n\r\n        -- 5️⃣ إنشاء سند الصرف\r\n        INSERT INTO payment_vouchers (\r\n            voucher_number,\r\n            date,\r\n            amount,\r\n            partner_id,\r\n            debit_account_id,\r\n            credit_account_id,\r\n            description,\r\n            status,\r\n            related_expense_id,\r\n            payment_method,\r\n            site_ref\r\n        ) VALUES (\r\n            v_voucher_no,\r\n            CURRENT_DATE,\r\n            (v_total - COALESCE(v_record.paid_amount, 0)),\r\n            v_record.payee_id,\r\n            v_debit_acc_id,\r\n            v_main_treasury_id,\r\n            'سداد مصروف: ' || COALESCE(v_record.description, '') || ' (صرف جماعي)',\r\n            'مسودة',\r\n            v_record.id,\r\n            'نقدي',\r\n            v_record.site_ref\r\n        );\r\n\r\n        -- 6️⃣ تحديث المصروف\r\n        UPDATE expenses \r\n        SET paid_amount = v_total \r\n        WHERE id = v_record.id;\r\n\r\n        -- 🚀 زيادة العداد للسجل التالي\r\n        v_counter := v_counter + 1;\r\n        \r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "sync_boq_from_logs_on_save",
    "function_code": "\r\nBEGIN\r\n    IF NEW.project_id IS NOT NULL THEN\r\n        \r\n        -- 1. العمالة المباشرة\r\n        NEW.actual_quantity := (SELECT COALESCE(SUM(productivity), 0) FROM public.labor_daily_logs WHERE project_id = NEW.project_id AND (work_item_id = NEW.id OR work_item_id = NEW.boq_item_id));\r\n        NEW.actual_labor_cost := (SELECT COALESCE(SUM(daily_wage), 0) FROM public.labor_daily_logs WHERE project_id = NEW.project_id AND (work_item_id = NEW.id OR work_item_id = NEW.boq_item_id));\r\n        \r\n        -- 2. الخامات المباشرة\r\n        NEW.actual_material_cost := (SELECT COALESCE(SUM(mil.total_price), 0) FROM public.material_issue_lines mil JOIN public.material_issues mi ON mi.id = mil.issue_id WHERE mi.project_id = NEW.project_id AND (mil.boq_item_id = NEW.boq_item_id OR mil.boq_id = NEW.id));\r\n        \r\n        -- 3. المصروفات الموزعة (🚀 التعديل هنا: استخدام boq_budget_id بدلاً من boq_item_id للـ View)\r\n        NEW.actual_expenses_cost := (\r\n            SELECT COALESCE(SUM(\"المبلغ المحمل (ر.س)\"), 0)\r\n            FROM public.advanced_cost_allocation_view\r\n            WHERE project_id = NEW.project_id \r\n              AND (boq_budget_id = NEW.boq_item_id OR boq_budget_id = NEW.id)\r\n        );\r\n\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_violations_bulk_v3",
    "function_code": "\r\nBEGIN\r\n    -- 1. حذف السندات المربوطة تسلسلياً بهذه المخالفات مهما كان رقم السند\r\n    DELETE FROM public.payment_vouchers \r\n    WHERE related_violation_id = ANY(violation_ids);\r\n\r\n    -- 2. إعادة حالة المخالفات إلى \"غير مرحلة\"\r\n    UPDATE public.violations \r\n    SET is_posted = false \r\n    WHERE id = ANY(violation_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "get_dashboard_totals",
    "function_code": "\r\nDECLARE\r\n    v_total_expenses numeric := 0;\r\n    v_total_paid numeric := 0;\r\n    v_total_pending numeric := 0;\r\nBEGIN\r\n    SELECT COALESCE(SUM(total_price), 0) INTO v_total_expenses FROM public.expenses WHERE is_deleted = false;\r\n    SELECT COALESCE(SUM(paid_amount), 0) INTO v_total_paid FROM public.expenses WHERE is_deleted = false;\r\n    v_total_pending := v_total_expenses - v_total_paid;\r\n\r\n    RETURN json_build_object(\r\n        'total_expenses', v_total_expenses,\r\n        'total_paid', v_total_paid,\r\n        'total_pending', v_total_pending,\r\n        'success', true\r\n    );\r\nEXCEPTION WHEN OTHERS THEN\r\n    RETURN json_build_object('success', false, 'error', SQLERRM);\r\nEND;\r\n"
  },
  {
    "function_name": "delete_payment_vouchers_bulk",
    "function_code": "\r\nBEGIN\r\n    -- مسح القيد أولاً\r\n    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids) AND v_type = 'payment_vouchers';\r\n    \r\n    -- مسح السند\r\n    DELETE FROM public.payment_vouchers WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_payment_vouchers_bulk",
    "function_code": "\r\nBEGIN\r\n    -- 1️⃣ حذف القيود اليومية المرتبطة بالسندات من جدول الـ Headers\r\n    -- (سيتم حذف الأسطر تلقائياً بفضل ON DELETE CASCADE المبرمج في جدول journal_lines)\r\n    -- هنا نحذف أي قيد يكون الـ reference_id الخاص به هو معرف السند\r\n    DELETE FROM public.journal_headers\r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- 2️⃣ تحديث المصروفات المرتبطة: إرجاع المبلغ المسدد (paid_amount) إلى 0\r\n    -- لأن فك ترحيل السند يعني أن عملية الدفع \"كأن لم تكن\" محاسبياً\r\n    UPDATE public.expenses\r\n    SET paid_amount = 0\r\n    WHERE id IN (\r\n        SELECT related_expense_id \r\n        FROM public.payment_vouchers \r\n        WHERE id = ANY(p_ids)\r\n    );\r\n\r\n    -- 3️⃣ إعادة حالة سندات الصرف إلى \"مسودة\" وفك علامة الترحيل\r\n    UPDATE public.payment_vouchers\r\n    SET is_posted = false,\r\n        status = 'مسودة'\r\n    WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "audit_and_suspend_mismatched_expenses",
    "function_code": "\r\nDECLARE\r\n    v_count INT := 0;\r\nBEGIN\r\n    -- تحديث المصروفات التي فيها اختلاف بين الإجمالي والمبلغ المدفوع\r\n    -- أو المصروفات التي تم ترحيلها ولكن قيدها المحاسبي به خلل\r\n    WITH mismatch AS (\r\n        SELECT \r\n            e.id\r\n        FROM public.expenses e\r\n        CROSS JOIN LATERAL (\r\n            -- حساب الإجمالي الحقيقي للمصروف (الأساسي + الضريبة - الخصم)\r\n            SELECT ROUND(\r\n                (COALESCE(e.total_price, (e.quantity * e.unit_price)) + COALESCE(e.vat_amount, 0) - COALESCE(e.discount_amount, 0)), \r\n                2\r\n            ) AS expected_total\r\n        ) calc\r\n        WHERE e.is_posted = true -- نبحث فقط في الفواتير المعتمدة (المرحلة)\r\n        AND (\r\n            -- الشرط: إذا كان إجمالي الفاتورة لا يساوي المبلغ المسدد المسجل\r\n            calc.expected_total <> ROUND(e.paid_amount, 2)\r\n            OR \r\n            -- أو إذا كان مجموع سندات الصرف الفعلي في جدول البايمنت لا يساوي المسجل في الاستحقاق\r\n            calc.expected_total <> (\r\n                SELECT ROUND(COALESCE(SUM(amount), 0), 2) \r\n                FROM public.payment_vouchers \r\n                WHERE related_expense_id = e.id\r\n            )\r\n        )\r\n    )\r\n    UPDATE public.expenses\r\n    SET is_posted = false -- 🚀 تحويلها لحالة \"معلق\" فقط\r\n    WHERE id IN (SELECT id FROM mismatch);\r\n\r\n    GET DIAGNOSTICS v_count = ROW_COUNT;\r\n    RETURN QUERY SELECT v_count;\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_expenses_bulk",
    "function_code": "\r\nDECLARE\r\n    v_voucher_ids UUID[];\r\nBEGIN\r\n    -- تجميع أرقام سندات الصرف المرتبطة بهذه المصروفات\r\n    SELECT array_agg(id) INTO v_voucher_ids\r\n    FROM public.payment_vouchers\r\n    WHERE related_expense_id = ANY(record_ids);\r\n\r\n    -- مسح قيود اليومية المرتبطة بالسندات ثم مسح السندات نفسها\r\n    IF v_voucher_ids IS NOT NULL THEN\r\n        DELETE FROM public.journal_headers WHERE reference_id = ANY(v_voucher_ids);\r\n        DELETE FROM public.payment_vouchers WHERE id = ANY(v_voucher_ids);\r\n    END IF;\r\n\r\n    -- مسح قيود المصروف الأساسي\r\n    DELETE FROM public.journal_headers WHERE reference_id = ANY(record_ids);\r\n\r\n    -- إرجاع المصروف غير مرحل وتصفير المبلغ المسدد\r\n    UPDATE public.expenses \r\n    SET is_posted = false, \r\n        paid_amount = 0\r\n    WHERE id = ANY(record_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "delete_expenses_bulk",
    "function_code": "\r\nDECLARE\r\n    v_voucher_ids UUID[];\r\nBEGIN\r\n    SELECT array_agg(id) INTO v_voucher_ids\r\n    FROM public.payment_vouchers\r\n    WHERE related_expense_id = ANY(record_ids);\r\n\r\n    IF v_voucher_ids IS NOT NULL THEN\r\n        DELETE FROM public.journal_headers WHERE reference_id = ANY(v_voucher_ids);\r\n        DELETE FROM public.payment_vouchers WHERE id = ANY(v_voucher_ids);\r\n    END IF;\r\n\r\n    DELETE FROM public.journal_headers WHERE reference_id = ANY(record_ids);\r\n    DELETE FROM public.expenses WHERE id = ANY(record_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "delete_sub_claim",
    "function_code": "\r\nBEGIN\r\n    -- أ) فك الترحيل ومسح قيود المستخلص أولاً من الجورنال لو كان مرحل\r\n    PERFORM public.rpc_unpost_claim(p_id);\r\n\r\n    -- ب) تحرير بنود المقايسة لترجع حالة البنود \"جاري التنفيذ\" لتدخل في مستخلصات أخرى\r\n    UPDATE public.contractor_assignments \r\n    SET status = 'جاري التنفيذ', claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- ج) تحرير أذون صرف الخامات لترجع تظهر في المستخلصات القادمة\r\n    UPDATE public.material_issues \r\n    SET claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- د) تحرير المصروفات النقدية المسجلة على المقاول\r\n    UPDATE public.expenses \r\n    SET is_deducted_in_claim = false, claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- هـ) التعديل الصحيح: تحرير سندات الصرف المربوطة بالمستخلص\r\n    UPDATE public.payment_vouchers \r\n    SET sub_claim_id = NULL \r\n    WHERE sub_claim_id = p_id;\r\n\r\n    -- و) أخيراً.. حذف المستخلص نفسه\r\n    DELETE FROM public.sub_claims WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "get_cost_center_dashboard",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        COALESCE(e.site_ref, 'مصروفات عامة (غير موجهة)') as property_name,\r\n        SUM(e.total_price) as total_cost,\r\n        SUM(e.vat_amount) as total_vat,\r\n        COUNT(e.id) as expense_count\r\n    FROM expenses e\r\n    WHERE e.is_posted = true -- 🔥 بنسحب المصروفات المعتمدة والمُرحلة فقط\r\n    GROUP BY COALESCE(e.site_ref, 'مصروفات عامة (غير موجهة)')\r\n    ORDER BY total_cost DESC;\r\nEND;\r\n"
  },
  {
    "function_name": "delete_labor_logs_bulk",
    "function_code": "\r\nBEGIN\r\n    -- 1. إيقاف الـ Triggers (الحراس) مؤقتاً بصلاحيات المدير\r\n    EXECUTE 'ALTER TABLE public.labor_daily_logs DISABLE TRIGGER USER';\r\n\r\n    -- 2. مسح القيود أولاً لتجنب أي أخطاء ترابط\r\n    DELETE FROM public.journal_headers \r\n    WHERE reference_id::uuid = ANY(p_ids);\r\n\r\n    -- 3. مسح اليوميات نفسها\r\n    DELETE FROM public.labor_daily_logs \r\n    WHERE id = ANY(p_ids);\r\n\r\n    -- 4. إعادة تشغيل الـ Triggers فوراً بعد انتهاء المسح\r\n    EXECUTE 'ALTER TABLE public.labor_daily_logs ENABLE TRIGGER USER';\r\nEND;\r\n"
  },
  {
    "function_name": "import_bulk_expenses",
    "function_code": "\r\nDECLARE\r\n    item jsonb;\r\n    v_hdr_id UUID;\r\n    v_acc_id UUID;\r\n    v_proj_id UUID;\r\n    v_part_id UUID;\r\n    v_cash_id UUID;\r\nBEGIN\r\n    -- كود الحساب الدائن (الخزينة)\r\n    SELECT id INTO v_cash_id FROM public.accounts WHERE code = '122' LIMIT 1;\r\n\r\n    FOR item IN SELECT * FROM jsonb_array_elements(expense_data)\r\n    LOOP\r\n        -- جلب المعرفات بناءً على البيانات\r\n        SELECT id INTO v_acc_id FROM public.accounts WHERE code = (item->>'acc_code') LIMIT 1;\r\n        SELECT id INTO v_proj_id FROM public.projects WHERE \"Property\" = (item->>'partner_name') LIMIT 1;\r\n        SELECT id INTO v_part_id FROM public.partners WHERE name = (item->>'partner_name') LIMIT 1;\r\n\r\n        -- إنشاء رأس القيد\r\n        INSERT INTO public.journal_headers (entry_date, description, status)\r\n        VALUES ((item->>'entry_date')::date, (item->>'description'), 'posted')\r\n        RETURNING id INTO v_hdr_id;\r\n\r\n        -- سطر المصروف (مدين)\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, item_name, quantity, unit_price, debit, credit, notes)\r\n        VALUES (\r\n            v_hdr_id, \r\n            COALESCE(v_acc_id, '00000000-0000-0000-0000-000000000000'), \r\n            v_part_id, \r\n            v_proj_id, \r\n            (item->>'item_name'), \r\n            (item->>'quantity')::numeric, \r\n            (item->>'unit_price')::numeric, \r\n            (item->>'amount')::numeric, \r\n            0, \r\n            (item->>'notes')\r\n        );\r\n\r\n        -- سطر الخزينة (دائن)\r\n        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes)\r\n        VALUES (v_hdr_id, v_cash_id, 0, (item->>'amount')::numeric, 'تسوية مصروف قديم');\r\n    END LOOP;\r\n    RETURN 'تم رفع جميع البيانات بنجاح';\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_invoices_bulk",
    "function_code": "\r\nDECLARE\r\n    v_receipt_ids UUID[];\r\nBEGIN\r\n    -- 1️⃣ تجميع أرقام معرفات (IDs) كل سندات القبض المرتبطة بالفواتير دي\r\n    SELECT array_agg(id) INTO v_receipt_ids \r\n    FROM receipt_vouchers \r\n    WHERE invoice_id = ANY(p_ids);\r\n\r\n    -- 2️⃣ مسح قيود اليومية المرتبطة بسندات القبض (إذا وجدت)\r\n    IF v_receipt_ids IS NOT NULL THEN\r\n        DELETE FROM journal_headers \r\n        WHERE reference_id = ANY(v_receipt_ids);\r\n        \r\n        -- 3️⃣ مسح سندات القبض نفسها نهائياً\r\n        DELETE FROM receipt_vouchers \r\n        WHERE id = ANY(v_receipt_ids);\r\n    END IF;\r\n\r\n    -- 4️⃣ مسح قيود اليومية المرتبطة بالفواتير نفسها\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- 5️⃣ تصفير ميزان الفاتورة وإرجاع حالتها\r\n    UPDATE invoices \r\n    SET \r\n        status = 'معلق',\r\n        paid_amount = 0  -- 🚀 هنا يرجع حالها كأنها لم تُسدد أبداً\r\n    WHERE id = ANY(p_ids);\r\n\r\nEND;\r\n"
  },
  {
    "function_name": "post_invoices_bulk",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_header_id UUID;\r\nBEGIN\r\n    FOR v_record IN \r\n        SELECT * FROM invoices WHERE id = ANY(p_ids) AND status != 'مُعتمد'\r\n    LOOP\r\n        -- 1️⃣ إنشاء رأس القيد (Journal Header)\r\n        INSERT INTO journal_headers (\r\n            entry_date, \r\n            description, \r\n            reference_id, \r\n            v_type, \r\n            status\r\n        ) VALUES (\r\n            v_record.date, \r\n            'ترحيل فاتورة مبيعات رقم: ' || v_record.invoice_number, \r\n            v_record.id, \r\n            'فاتورة مبيعات', \r\n            'posted'\r\n        ) RETURNING id INTO v_header_id;\r\n\r\n        -- 2️⃣ سطر مديونية العميل (الصافي): نربط الـ partner_id هنا ✅\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (\r\n            v_header_id, \r\n            v_record.debit_account_id, \r\n            v_record.total_amount, \r\n            0, \r\n            v_record.partner_id, \r\n            'استحقاق الفاتورة (صافي القيمة)'\r\n        );\r\n\r\n        -- 3️⃣ سطر محتجز ضمان الأعمال: نربط الـ partner_id هنا أيضاً ✅\r\n        IF COALESCE(v_record.guarantee_amount, 0) > 0 THEN\r\n            INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n            VALUES (\r\n                v_header_id, \r\n                v_record.guarantee_acc_id, \r\n                v_record.guarantee_amount, \r\n                0, \r\n                v_record.partner_id, \r\n                'محتجز ضمان أعمال مسترد'\r\n            );\r\n        END IF;\r\n\r\n        -- 4️⃣ سطر الإيرادات: نضع الـ partner_id بـ NULL لعدم الظهور في كشف حسابه ❌\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (\r\n            v_header_id, \r\n            v_record.credit_account_id, \r\n            0, \r\n            v_record.taxable_amount, \r\n            NULL, -- 🚀 تنظيف كشف حساب العميل\r\n            'إيرادات مبيعات/مستخلصات'\r\n        );\r\n\r\n        -- 5️⃣ سطر الضريبة: نضع الـ partner_id بـ NULL لعدم الظهور في كشف حسابه ❌\r\n        IF COALESCE(v_record.tax_amount, 0) > 0 THEN\r\n            INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n            VALUES (\r\n                v_header_id, \r\n                v_record.tax_acc_id, \r\n                0, \r\n                v_record.tax_amount, \r\n                NULL, -- 🚀 تنظيف كشف حساب العميل\r\n                'ضريبة قيمة مضافة مبيعات'\r\n            );\r\n        END IF;\r\n\r\n        -- تحديث حالة الفاتورة\r\n        UPDATE invoices SET status = 'مُعتمد' WHERE id = v_record.id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "suspend_mismatched_expenses",
    "function_code": "\r\nDECLARE\r\n    v_count INT := 0;\r\nBEGIN\r\n    -- تحديث المصروفات التي فيها اختلاف بين الإجمالي والمبلغ المدفوع أو سندات الصرف\r\n    WITH mismatch AS (\r\n        SELECT \r\n            e.id\r\n        FROM public.expenses e\r\n        CROSS JOIN LATERAL (\r\n            -- حساب الإجمالي الحقيقي للمصروف (الأساسي + الضريبة - الخصم)\r\n            SELECT ROUND(\r\n                (COALESCE(e.total_price, (e.quantity * e.unit_price)) + COALESCE(e.vat_amount, 0) - COALESCE(e.discount_amount, 0)), \r\n                2\r\n            ) AS expected_total\r\n        ) calc\r\n        WHERE e.is_posted = true -- نبحث فقط في الفواتير المعتمدة (المرحلة)\r\n        AND (\r\n            -- الشرط الأول: إجمالي الفاتورة لا يساوي المبلغ المسدد المسجل\r\n            calc.expected_total <> ROUND(e.paid_amount, 2)\r\n            OR \r\n            -- الشرط الثاني: مجموع سندات الصرف الفعلي لا يساوي الإجمالي\r\n            calc.expected_total <> (\r\n                SELECT ROUND(COALESCE(SUM(amount), 0), 2) \r\n                FROM public.payment_vouchers \r\n                WHERE related_expense_id = e.id\r\n            )\r\n        )\r\n    )\r\n    UPDATE public.expenses\r\n    SET is_posted = false -- 🚀 تحويلها لحالة \"معلق\" فقط\r\n    WHERE id IN (SELECT id FROM mismatch);\r\n\r\n    GET DIAGNOSTICS v_count = ROW_COUNT;\r\n    RETURN v_count;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_unpost_claim",
    "function_code": "\r\nDECLARE\r\n    v_jv_id UUID;\r\nBEGIN\r\n    -- أ) الاحتفاظ بآيدي القيد قبل مسحه\r\n    SELECT jv_header_id INTO v_jv_id FROM public.sub_claims WHERE id = p_id;\r\n    \r\n    -- ب) فك الارتباط أولاً من المستخلص (لتجنب خطأ الفورين كي)\r\n    UPDATE public.sub_claims \r\n    SET is_posted = false, \r\n        status = 'مسودة', \r\n        jv_header_id = NULL, \r\n        jv_id = NULL \r\n    WHERE id = p_id;\r\n\r\n    -- ج) الآن يمكننا مسح القيد بأمان\r\n    IF v_jv_id IS NOT NULL THEN\r\n        DELETE FROM public.journal_lines WHERE header_id = v_jv_id;\r\n        DELETE FROM public.journal_headers WHERE id = v_jv_id;\r\n    END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "fix_temp_import_id",
    "function_code": "\r\nBEGIN\r\n    -- لو الإكسيل باعت الآيدي فاضي (NULL أو نص فارغ)، السيستم هيعمله آيدي جديد\r\n    IF NEW.id IS NULL OR TRIM(NEW.id) = '' THEN\r\n        NEW.id := gen_random_uuid()::text;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "get_real_totals",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY \r\n    SELECT \r\n        (SELECT ROUND(SUM(COALESCE((quantity * unit_price), 0) + COALESCE(vat_amount, 0) - COALESCE(discount_amount, 0)), 2) \r\n         FROM public.expenses WHERE is_posted = true),\r\n         \r\n        (SELECT ROUND(SUM(amount), 2) \r\n         FROM public.payment_vouchers WHERE is_posted = false);\r\nEND;\r\n"
  },
  {
    "function_name": "smart_audit_delete",
    "function_code": "\r\nDECLARE\r\n    v_ref_id uuid;\r\n    v_type_val text;\r\nBEGIN\r\n    -- 🚀 السيناريو الأول: الخطأ من جدول القيود (journal_headers)\r\n    IF p_table_name = 'journal_headers' THEN\r\n        SELECT reference_id, v_type INTO v_ref_id, v_type_val \r\n        FROM public.journal_headers WHERE id = p_error_id;\r\n\r\n        IF v_type_val = 'labor_daily_logs' AND v_ref_id IS NOT NULL THEN\r\n            -- مسح القيد المضروب من الجورنال\r\n            DELETE FROM public.journal_lines WHERE header_id = p_error_id;\r\n            DELETE FROM public.journal_headers WHERE id = p_error_id;\r\n            -- 🛡️ تعليق اليومية (تحويلها لمسودة) بدل مسحها\r\n            UPDATE public.labor_daily_logs SET is_posted = false WHERE id = v_ref_id;\r\n        ELSE\r\n            -- مسح قيد عادي\r\n            DELETE FROM public.journal_lines WHERE header_id = p_error_id;\r\n            DELETE FROM public.journal_headers WHERE id = p_error_id;\r\n        END IF;\r\n\r\n    -- 🚀 السيناريو الثاني: الخطأ من جدول العمالة نفسه (labor_daily_logs)\r\n    ELSIF p_table_name = 'labor_daily_logs' THEN\r\n        -- مسح قيود اليومية من الجورنال\r\n        DELETE FROM public.journal_lines WHERE header_id IN (SELECT id FROM public.journal_headers WHERE reference_id = p_error_id AND v_type = 'labor_daily_logs');\r\n        DELETE FROM public.journal_headers WHERE reference_id = p_error_id AND v_type = 'labor_daily_logs';\r\n        -- 🛡️ تعليق اليومية بدل مسحها نهائياً\r\n        UPDATE public.labor_daily_logs SET is_posted = false WHERE id = p_error_id;\r\n\r\n    -- 🚀 السيناريو الثالث: الخطأ من جدول سطور القيود (journal_lines)\r\n    ELSIF p_table_name = 'journal_lines' THEN\r\n        EXECUTE format('DELETE FROM public.%I WHERE id = %L', p_table_name, p_error_id);\r\n\r\n    -- 🧱 السيناريو الرابع (الجديد): الخطأ في أسطر استلام الخامات\r\n    ELSIF p_table_name = 'material_receipt_lines' THEN\r\n        -- مسح سطر الاستلام المعيب مباشرة\r\n        DELETE FROM public.material_receipt_lines WHERE id = p_error_id;\r\n\r\n    -- 💰 السيناريو الخامس (الجديد للحماية): الخطأ في المصروفات \r\n    ELSIF p_table_name = 'expenses' THEN\r\n        -- 🛡️ تعليق المصروف (is_posted = false) ليعود للمراجعة ولا يتم حذفه\r\n        UPDATE public.expenses SET is_posted = false WHERE id = p_error_id;\r\n\r\n    -- ⚠️ مسح من أي جدول آخر غير مصنف (Dynamic SQL)\r\n    ELSE\r\n        EXECUTE format('DELETE FROM public.%I WHERE id = %L', p_table_name, p_error_id);\r\n    END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "delete_receipt_vouchers_bulk",
    "function_code": "\r\nBEGIN\r\n    -- نحذف القيود الأول لو فيه أي قيد متعلق بيها (للاحتياط لو كان معلق بس ليه قيد)\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids) AND source_module = 'receipt_vouchers';\r\n\r\n    DELETE FROM receipt_vouchers \r\n    WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "post_receipt_vouchers_bulk",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_header_id UUID;\r\nBEGIN\r\n    FOR v_record IN \r\n        SELECT * FROM receipt_vouchers WHERE id = ANY(p_ids) AND status = 'مسودة'\r\n    FOR UPDATE\r\n    LOOP\r\n        -- إنشاء رأس القيد (Journal Header)\r\n        INSERT INTO journal_headers (\r\n            date, \r\n            description, \r\n            reference_id, \r\n            source_module\r\n        ) VALUES (\r\n            v_record.date,\r\n            COALESCE(v_record.notes, 'سند قبض رقم ' || v_record.receipt_number),\r\n            v_record.id,\r\n            'receipt_vouchers'\r\n        ) RETURNING id INTO v_header_id;\r\n\r\n        -- السطر المدين (الخزينة/البنك - safe_bank_acc_id)\r\n        INSERT INTO journal_lines (\r\n            header_id,\r\n            account_id,\r\n            debit,\r\n            credit,\r\n            partner_id\r\n        ) VALUES (\r\n            v_header_id,\r\n            v_record.safe_bank_acc_id,\r\n            v_record.amount,\r\n            0,\r\n            v_record.partner_id\r\n        );\r\n\r\n        -- السطر الدائن (العميل/الجهة - partner_acc_id)\r\n        INSERT INTO journal_lines (\r\n            header_id,\r\n            account_id,\r\n            debit,\r\n            credit,\r\n            partner_id\r\n        ) VALUES (\r\n            v_header_id,\r\n            v_record.partner_acc_id,\r\n            0,\r\n            v_record.amount,\r\n            v_record.partner_id\r\n        );\r\n\r\n        -- تحديث حالة السند\r\n        UPDATE receipt_vouchers \r\n        SET status = 'مرحل'\r\n        WHERE id = v_record.id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_receipt_vouchers_bulk",
    "function_code": "\r\nBEGIN\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(record_ids) AND source_module = 'receipt_vouchers';\r\n\r\n    UPDATE receipt_vouchers \r\n    SET status = 'مسودة' \r\n    WHERE id = ANY(record_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_unpost_material",
    "function_code": "\r\nDECLARE\r\n  v_jv UUID;\r\nBEGIN\r\n  SELECT jv_id INTO v_jv FROM public.material_receipts WHERE id = p_id;\r\n  \r\n  UPDATE public.material_receipts SET is_posted = false, jv_id = NULL WHERE id = p_id;\r\n\r\n  IF v_jv IS NOT NULL THEN\r\n    DELETE FROM public.journal_lines WHERE header_id = v_jv;\r\n    DELETE FROM public.journal_headers WHERE id = v_jv;\r\n  END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_delete_material_receipt",
    "function_code": "\r\nBEGIN\r\n  PERFORM public.rpc_unpost_material(p_id);\r\n  DELETE FROM public.material_receipts WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "get_total_stats",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    COALESCE(SUM(CAST(prod AS NUMERIC)), 0) as total_production,\r\n    COALESCE(SUM(CAST(d_w AS NUMERIC)), 0) as total_days_worked,\r\n    COUNT(*) FILTER (WHERE attendance LIKE '%حاضر%' OR attendance = '1') as total_attendance,\r\n    COUNT(*) as records_count\r\n  FROM daily_report\r\n  WHERE \r\n    (p_search_name = '' OR emp_name ILIKE '%' || p_search_name || '%') AND\r\n    (p_start_date = '' OR date >= p_start_date) AND\r\n    (p_end_date = '' OR date <= p_end_date);\r\nEND;\r\n"
  },
  {
    "function_name": "handle_payment_voucher_cash_flow",
    "function_code": "\r\nDECLARE\r\n    v_project_id uuid := NULL;\r\nBEGIN\r\n    IF TG_OP = 'DELETE' THEN\r\n        DELETE FROM public.cash_flows WHERE source_id = OLD.id AND source_type = 'payment_voucher';\r\n        RETURN OLD;\r\n    END IF;\r\n\r\n    -- 🛡️ حماية: تجاهل السندات التي قيمتها صفر أو أقل\r\n    IF NEW.amount <= 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n\r\n    IF NEW.sub_claim_id IS NOT NULL THEN\r\n        SELECT project_id INTO v_project_id FROM public.sub_claims WHERE id = NEW.sub_claim_id;\r\n    ELSIF NEW.related_expense_id IS NOT NULL THEN \r\n        SELECT project_id INTO v_project_id FROM public.expenses WHERE id = NEW.related_expense_id;\r\n    END IF;\r\n\r\n    IF EXISTS (SELECT 1 FROM public.cash_flows WHERE source_id = NEW.id AND source_type = 'payment_voucher') THEN\r\n        UPDATE public.cash_flows SET\r\n            transaction_date = NEW.date, amount = NEW.amount, payment_method = NEW.payment_method,\r\n            reference_number = COALESCE(NEW.reference_no, NEW.voucher_number), description = COALESCE(NEW.description, NEW.notes),\r\n            account_id = NEW.credit_account_id, project_id = v_project_id, partner_id = NEW.partner_id\r\n        WHERE source_id = NEW.id AND source_type = 'payment_voucher';\r\n    ELSE\r\n        INSERT INTO public.cash_flows (\r\n            transaction_date, flow_type, amount, category, sub_category, payment_method, \r\n            reference_number, description, account_id, project_id, partner_id, source_id, source_type\r\n        ) VALUES (\r\n            NEW.date, 'outflow', NEW.amount, 'أنشطة تشغيلية', 'صرف بموجب سند صرف رقم: ' || COALESCE(NEW.voucher_number, ''), \r\n            NEW.payment_method, COALESCE(NEW.reference_no, NEW.voucher_number), COALESCE(NEW.description, NEW.notes), \r\n            NEW.credit_account_id, v_project_id, NEW.partner_id, NEW.id, 'payment_voucher'\r\n        );\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_direct_expenses_live",
    "function_code": "\r\nBEGIN\r\n    -- أ: في حالة الحذف أو التعديل (نعيد حساب تكلفة البند القديم المزال منه المصروف)\r\n    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN\r\n        IF OLD.project_id IS NOT NULL AND OLD.description IS NOT NULL THEN\r\n            UPDATE public.boq_budget b\r\n            SET actual_expenses_cost = COALESCE((\r\n                SELECT SUM(e.total_price)\r\n                FROM public.expenses e\r\n                WHERE e.project_id = OLD.project_id\r\n                  AND TRIM(BOTH FROM e.description) = TRIM(BOTH FROM OLD.description)\r\n            ), 0)\r\n            WHERE b.id IN (\r\n                SELECT d.id FROM public.boq_budget_distinct d \r\n                WHERE d.project_id = OLD.project_id AND TRIM(BOTH FROM d.work_item) = TRIM(BOTH FROM OLD.description)\r\n            );\r\n        END IF;\r\n    END IF;\r\n\r\n    -- ب: في حالة الإضافة أو التعديل (نحسب التكلفة الجديدة للبند المضاف إليه المصروف)\r\n    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN\r\n        IF NEW.project_id IS NOT NULL AND NEW.description IS NOT NULL THEN\r\n            UPDATE public.boq_budget b\r\n            SET actual_expenses_cost = COALESCE((\r\n                SELECT SUM(e.total_price)\r\n                FROM public.expenses e\r\n                WHERE e.project_id = NEW.project_id\r\n                  AND TRIM(BOTH FROM e.description) = TRIM(BOTH FROM NEW.description)\r\n            ), 0)\r\n            WHERE b.id IN (\r\n                SELECT d.id FROM public.boq_budget_distinct d \r\n                WHERE d.project_id = NEW.project_id AND TRIM(BOTH FROM d.work_item) = TRIM(BOTH FROM NEW.description)\r\n            );\r\n        END IF;\r\n    END IF;\r\n\r\n    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "bulk_disburse_v2",
    "function_code": "DECLARE\r\n    v_main_treasury_id UUID := '21b8a1db-bc9f-4cf8-b741-1efeded0963c';\r\n    -- 🚀 السر هنا: نستخدم clock_timestamp() للملي ثانية + رقم عشوائي لضمان عدم التكرار نهائياً\r\n    v_batch_id TEXT := to_char(clock_timestamp(), 'YYMMDDHH24MISSMS') || '-' || FLOOR(random() * 10000)::TEXT;\r\n    v_count INT;\r\n    v_sum NUMERIC;\r\nBEGIN\r\n    WITH calculated_vouchers AS (\r\n        SELECT \r\n            id as exp_id,\r\n            payee_id,\r\n            exp_date, -- 👈 استخرجنا التاريخ\r\n            payment_account,\r\n            site_ref,\r\n            description,\r\n            ROUND(\r\n                (COALESCE((SELECT SUM(COALESCE((line->>'total_price')::numeric, (line->>'quantity')::numeric * (line->>'unit_price')::numeric, 0))\r\n                   FROM jsonb_array_elements(CASE WHEN jsonb_typeof(lines_data) = 'array' THEN lines_data ELSE '[]'::jsonb END) AS line), (quantity * unit_price)) \r\n                   + COALESCE(vat_amount, 0) - COALESCE(discount_amount, 0)) \r\n                   - COALESCE(paid_amount, 0)\r\n            , 2) as amount_to_transfer\r\n        FROM public.expenses\r\n        WHERE id = ANY(p_ids)\r\n    ),\r\n    actual_insertion AS (\r\n        INSERT INTO public.payment_vouchers (\r\n            voucher_number, date, amount, partner_id, debit_account_id, \r\n            credit_account_id, description, status, related_expense_id, \r\n            payment_method, site_ref, created_by, is_posted\r\n        )\r\n        SELECT \r\n            'PV-' || v_batch_id || '-' || row_number() OVER (),\r\n            exp_date,          -- 👈 التعديل 1: تاريخ السند هو تاريخ المصروف\r\n            amount_to_transfer,\r\n            NULL,              -- 👈 التعديل 2: حذف البارتنر (سيكون NULL)\r\n            (SELECT id FROM accounts WHERE (code || ' - ' || name) = calculated_vouchers.payment_account OR name = calculated_vouchers.payment_account LIMIT 1),\r\n            v_main_treasury_id,\r\n            'سداد مصروف: ' || COALESCE(description, '') || ' (صرف جماعي)',\r\n            'مسودة',\r\n            exp_id,\r\n            'نقدي',\r\n            site_ref,\r\n            p_user_id,\r\n            false\r\n        FROM calculated_vouchers\r\n        WHERE amount_to_transfer > 0 \r\n        RETURNING amount, related_expense_id\r\n    ),\r\n    update_expenses AS (\r\n        UPDATE public.expenses e\r\n        SET paid_amount = e.paid_amount + ai.amount\r\n        FROM actual_insertion ai\r\n        WHERE e.id = ai.related_expense_id\r\n    )\r\n    SELECT COUNT(*), SUM(amount) INTO v_count, v_sum FROM actual_insertion;\r\n\r\n    RETURN QUERY SELECT COALESCE(v_count, 0), COALESCE(v_sum, 0);\r\nEND;"
  },
  {
    "function_name": "auto_link_expense_to_job_order",
    "function_code": "\r\nBEGIN\r\n    -- إذا كان المصروف ملوش أمر شغل، هندور على أمر الشغل بتاع المقاول والفيلا ونربطه\r\n    IF NEW.job_order_id IS NULL AND NEW.project_id IS NOT NULL AND NEW.payee_id IS NOT NULL THEN\r\n        SELECT id INTO NEW.job_order_id\r\n        FROM public.job_orders\r\n        WHERE project_id = NEW.project_id\r\n          AND contractor_id = NEW.payee_id\r\n          AND status IN ('جاري التنفيذ', 'مسودة')\r\n        ORDER BY created_at DESC\r\n        LIMIT 1;\r\n\r\n        -- لو لقينا أمر شغل، هنفعل خيار \"يخصم من المقاول\" أوتوماتيك\r\n        IF NEW.job_order_id IS NOT NULL THEN\r\n            NEW.is_deducted_from_contractor := true; \r\n        END IF;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "fix_and_reset_corrupted_vouchers",
    "function_code": "\r\nDECLARE\r\n    v_item RECORD;\r\nBEGIN\r\n    -- أ. مسح أسطر القيود (journal_lines) التي لا تمتلك رأس قيد (أيتام)\r\n    DELETE FROM public.journal_lines WHERE header_id NOT IN (SELECT id FROM public.journal_headers);\r\n\r\n    -- ب. البحث عن أي \"سند صرف\" قيده غير متزن أو مبالغه غير مطابقة\r\n    -- سيتم مسح السند، مسح القيد، وتصفير المصروف المرتبط به\r\n    FOR v_item IN \r\n        SELECT \r\n            pv.id AS voucher_id, \r\n            pv.related_expense_id,\r\n            h.id AS header_id\r\n        FROM public.payment_vouchers pv\r\n        LEFT JOIN public.journal_headers h ON h.reference_id = pv.id\r\n        LEFT JOIN (\r\n            SELECT header_id, SUM(debit) as total_debit, SUM(credit) as total_credit \r\n            FROM public.journal_lines GROUP BY header_id\r\n        ) l ON l.header_id = h.id\r\n        WHERE \r\n            h.id IS NULL -- سند مرحل بلا قيد\r\n            OR ROUND(l.total_debit, 2) <> ROUND(l.total_credit, 2) -- قيد غير متزن\r\n            OR ROUND(l.total_debit, 2) <> ROUND(pv.amount, 2) -- قيد لا يطابق قيمة السند\r\n    LOOP\r\n        -- 1. مسح القيود المرتبطة بالسند (رأس وأسطر)\r\n        IF v_item.header_id IS NOT NULL THEN\r\n            DELETE FROM public.journal_headers WHERE id = v_item.header_id;\r\n        END IF;\r\n\r\n        -- 2. مسح سند الصرف نفسه لأنه غير مطابق\r\n        DELETE FROM public.payment_vouchers WHERE id = v_item.voucher_id;\r\n\r\n        -- 3. 🚀 الأهم: إعادة المصروف المرتبط لحالته الأولى (معلق وغير مسدد)\r\n        IF v_item.related_expense_id IS NOT NULL THEN\r\n            UPDATE public.expenses \r\n            SET paid_amount = 0, \r\n                is_posted = false \r\n            WHERE id = v_item.related_expense_id;\r\n        END IF;\r\n    END LOOP;\r\n\r\n    -- ج. تنظيف المصروفات التي تم ترحيلها (Accrual) ولكن قيدها غير متزن\r\n    FOR v_item IN \r\n        SELECT h.id as header_id, h.reference_id as expense_id\r\n        FROM public.journal_headers h\r\n        JOIN public.journal_lines l ON h.id = l.header_id\r\n        WHERE h.reference_id IN (SELECT id FROM public.expenses)\r\n        GROUP BY h.id, h.reference_id\r\n        HAVING ROUND(SUM(l.debit), 2) <> ROUND(SUM(l.credit), 2)\r\n    LOOP\r\n        -- مسح القيد المضروب\r\n        DELETE FROM public.journal_headers WHERE id = v_item.header_id;\r\n        -- فك ترحيل المصروف\r\n        UPDATE public.expenses SET is_posted = false, paid_amount = 0 WHERE id = v_item.expense_id;\r\n    END LOOP;\r\n\r\nEND;\r\n"
  },
  {
    "function_name": "get_employees_with_custom_totals_v2",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    -- معالجة الإنتاج: إزالة كل ما هو ليس أرقام، وإذا كانت النتيجة نقطة فقط أو فارغة تحول لـ 0\r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN REGEXP_REPLACE(prod::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(prod::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_production,\r\n    \r\n    -- معالجة أيام العمل D_W بنفس الطريقة\r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN REGEXP_REPLACE(d_w::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(d_w::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_days_worked,\r\n    \r\n    -- حساب الحضور\r\n    COUNT(*) FILTER (\r\n      WHERE attendance::TEXT ILIKE '%حاضر%' \r\n      OR attendance::TEXT = '1'\r\n    )::BIGINT as total_attendance,\r\n    \r\n    -- إجمالي السجلات\r\n    COUNT(*)::BIGINT as records_count\r\n    \r\n  FROM daily_report\r\n  WHERE \r\n    (NULLIF(p_search_name, '') IS NULL OR emp_name ILIKE '%' || p_search_name || '%') AND\r\n    (NULLIF(p_start_date, '') IS NULL OR date >= p_start_date) AND\r\n    (NULLIF(p_end_date, '') IS NULL OR date <= p_end_date);\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_summary_v2",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    d.emp_name,\r\n    -- نفس منطق التنظيف والحساب اللي استعملناه في الدالة السابقة\r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_production,\r\n    \r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_days_worked,\r\n    \r\n    COUNT(*) FILTER (\r\n      WHERE d.attendance::TEXT ILIKE '%حاضر%' \r\n      OR d.attendance::TEXT = '1'\r\n    )::BIGINT as attendance_count,\r\n\r\n    MAX(d.date)::TEXT as last_report_date -- عشان تعرف أخر يوم الموظف ده اشتغل فيه\r\n    \r\n  FROM daily_report d\r\n  WHERE \r\n    (NULLIF(p_search_name, '') IS NULL OR d.emp_name ILIKE '%' || p_search_name || '%') AND\r\n    (NULLIF(p_start_date, '') IS NULL OR d.date >= p_start_date) AND\r\n    (NULLIF(p_end_date, '') IS NULL OR d.date <= p_end_date)\r\n  GROUP BY d.emp_name\r\n  ORDER BY total_production DESC; -- ترتيب حسب الأكثر إنتاجاً\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_with_stats_v3",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, 'بدون وظيفة') as job_title,\r\n    \r\n    -- حساب الإنتاج: استخدام NULLIF لتجنب أخطاء التحويل\r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN d.prod IS NULL THEN 0\r\n        WHEN REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_production,\r\n    \r\n    COALESCE(SUM(\r\n      CASE \r\n        WHEN d.d_w IS NULL THEN 0\r\n        WHEN REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g') ~ '^\\d+(\\.\\d+)?$' \r\n        THEN REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g')::NUMERIC \r\n        ELSE 0 \r\n      END\r\n    ), 0) as total_days_worked,\r\n    \r\n    COUNT(d.id) FILTER (WHERE d.attendance::TEXT ILIKE '%حاضر%' OR d.attendance::TEXT = '1')::BIGINT,\r\n    MAX(d.date)::TEXT\r\n    \r\n  FROM all_emp a\r\n  -- استخدام LEFT JOIN يضمن ظهور الموظف حتى لو لم يوجد له سجلات\r\n  LEFT JOIN daily_report d ON \r\n    -- تنظيف الأسماء من المسافات تماماً قبل الربط\r\n    REPLACE(a.emp_name, ' ', '') = REPLACE(d.emp_name, ' ', '')\r\n    \r\n  WHERE \r\n    (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n    -- تم إزالة فلاتر التاريخ من الـ WHERE مؤقتاً للتأكد من ظهور البيانات\r\n  GROUP BY a.emp_id, a.emp_name, a.job_title\r\n  ORDER BY a.emp_name ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_emp_attendance_and_work_v5",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    \r\n    -- 1. مجموع أيام العمل (d_w) من جدول daily_report\r\n    COALESCE((\r\n      SELECT SUM(\r\n        CASE \r\n          WHEN d.d_w::TEXT ~ '^\\d+(\\.\\d+)?$' THEN d.d_w::NUMERIC \r\n          ELSE 0 \r\n        END\r\n      )\r\n      FROM daily_report d\r\n      WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (NULLIF(p_start_date, '') IS NULL OR d.date >= p_start_date)\r\n      AND (NULLIF(p_end_date, '') IS NULL OR d.date <= p_end_date)\r\n    ), 0) as total_days_worked,\r\n\r\n    -- 2. مجموع الحضور (attendance)\r\n    COALESCE((\r\n      SELECT COUNT(*)\r\n      FROM daily_report d\r\n      WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (NULLIF(p_start_date, '') IS NULL OR d.date >= p_start_date)\r\n      AND (NULLIF(p_end_date, '') IS NULL OR d.date <= p_end_date)\r\n    ), 0)::BIGINT as attendance_count,\r\n\r\n    a.job_title\r\n    \r\n  FROM all_emp a\r\n  WHERE (NULLIF(p_search_name, '') IS NULL OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY a.emp_id::INTEGER ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "auto_fill_violation_names",
    "function_code": "\r\nBEGIN\r\n  -- أ: جلب اسم العامل ومهنته من جدول الشركاء لو الـ partner_id موجود\r\n  IF NEW.partner_id IS NOT NULL THEN\r\n    SELECT name, partner_type INTO NEW.emp_name, NEW.profession\r\n    FROM public.partners\r\n    WHERE id = NEW.partner_id;\r\n  END IF;\r\n\r\n  -- ب: جلب اسم الموقع من جدول المشاريع لو الـ project_id موجود\r\n  IF NEW.project_id IS NOT NULL THEN\r\n    SELECT \"Property\" INTO NEW.site_name\r\n    FROM public.projects\r\n    WHERE id = NEW.project_id;\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_stats_v5",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- 1. مجموع الإنتاج من daily_report (عمود prod)\r\n    COALESCE((SELECT SUM(CASE WHEN d.prod ~ '^\\d+(\\.\\d+)?$' THEN d.prod::NUMERIC ELSE 0 END)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 2. مجموع أيام العمل من daily_report (عمود d_w)\r\n    COALESCE((SELECT SUM(CASE WHEN d.d_w ~ '^\\d+(\\.\\d+)?$' THEN d.d_w::NUMERIC ELSE 0 END)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 3. عدد أيام الحضور (عمود attendance)\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- 4. إجمالي السلف من emp_adv\r\n    COALESCE((SELECT SUM(amount::NUMERIC) FROM emp_adv v \r\n      WHERE TRIM(v.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- 5. إجمالي الخصومات من emp_ded\r\n    COALESCE((SELECT SUM(amount::NUMERIC) FROM emp_ded de \r\n      WHERE TRIM(de.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY a.emp_id::INTEGER ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_full_financials_v7",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- 1. الإنتاج (prod)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 2. مجموع d_w (أيام العمل)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 3. عدد أيام الحضور (attendance)\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- 4. إجمالي السلف (من جدول emp_adv)\r\n    COALESCE((SELECT SUM(v.amount::NUMERIC) FROM emp_adv v \r\n      WHERE TRIM(v.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- 5. إجمالي الخصومات (من جدول emp_ded)\r\n    COALESCE((SELECT SUM(de.amount::NUMERIC) FROM emp_ded de \r\n      WHERE TRIM(de.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0),\r\n\r\n    -- 6. إجمالي السكن (من جدول housing)\r\n    COALESCE((SELECT SUM(h.amount::NUMERIC) FROM housing h \r\n      WHERE TRIM(h.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR h.deduction_month::TEXT >= p_start_date OR h.deduction_month IS NOT NULL)), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY NULLIF(a.emp_id, '')::INTEGER ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_final_v8",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- حساب الإنتاج (daily_report)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- مجموع أيام العمل d_w (daily_report)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- عدد الحضور (daily_report)\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE TRIM(d.emp_name) = TRIM(a.emp_name)\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- إجمالي السلف (emp_adv)\r\n    COALESCE((SELECT SUM(amount::NUMERIC) FROM emp_adv v \r\n      WHERE TRIM(v.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- إجمالي الخصومات (emp_ded)\r\n    COALESCE((SELECT SUM(de.amount::NUMERIC) FROM emp_ded de \r\n      WHERE TRIM(de.emp_name) = TRIM(a.emp_name)\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0),\r\n\r\n    -- إجمالي السكن (housing)\r\n    COALESCE((SELECT SUM(h.amount::NUMERIC) FROM housing h \r\n      WHERE TRIM(h.emp_name) = TRIM(a.emp_name)), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY CASE WHEN a.emp_id ~ '^\\d+$' THEN a.emp_id::INTEGER ELSE 999999 END ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_project_labor_costs_rpc",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY \r\n  SELECT * FROM public.vw_project_labor_costs \r\n  ORDER BY \"تاريخ اليومية\" DESC, id ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "delete_violations_bulk",
    "function_code": "\r\nBEGIN\r\n    -- 1. فك الترحيل أولاً لضمان مسح القيود والسندات\r\n    PERFORM public.unpost_violations_bulk_journal(p_ids);\r\n\r\n    -- 2. مسح المخالفة نفسها\r\n    DELETE FROM public.violations WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_violations_bulk",
    "function_code": "\r\nBEGIN\r\n    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids) AND v_type = 'violations';\r\n    UPDATE public.violations SET is_posted = false WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_final_v9",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- 1. الإنتاج: تنظيف النص وتحويله لرقم\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(BOTH ' ' FROM d.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 2. أيام العمل d_w\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE TRIM(BOTH ' ' FROM d.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 3. الحضور attendance\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE TRIM(BOTH ' ' FROM d.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- 4. السلف (emp_adv)\r\n    COALESCE((SELECT SUM(v.amount::NUMERIC) FROM emp_adv v \r\n      WHERE TRIM(BOTH ' ' FROM v.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- 5. الخصومات (emp_ded)\r\n    COALESCE((SELECT SUM(de.amount::NUMERIC) FROM emp_ded de \r\n      WHERE TRIM(BOTH ' ' FROM de.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0),\r\n\r\n    -- 6. السكن (housing)\r\n    COALESCE((SELECT SUM(h.amount::NUMERIC) FROM housing h \r\n      WHERE TRIM(BOTH ' ' FROM h.emp_name) = TRIM(BOTH ' ' FROM a.emp_name)), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY CASE WHEN a.emp_id ~ '^\\d+$' THEN a.emp_id::INTEGER ELSE 999 END ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_final_v10",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- حساب الإنتاج (daily_report) باستخدام تنظيف الأسماء المكثف\r\n    (SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC), 0)\r\n     FROM daily_report d WHERE REGEXP_REPLACE(d.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g')\r\n     AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)),\r\n\r\n    -- حساب أيام العمل d_w\r\n    (SELECT COALESCE(SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC), 0)\r\n     FROM daily_report d WHERE REGEXP_REPLACE(d.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g')\r\n     AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)),\r\n\r\n    -- حساب الحضور\r\n    (SELECT COUNT(*) FROM daily_report d \r\n     WHERE REGEXP_REPLACE(d.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g')\r\n     AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n     AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)),\r\n\r\n    -- حساب السلف (emp_adv)\r\n    (SELECT COALESCE(SUM(v.amount::NUMERIC), 0) FROM emp_adv v \r\n     WHERE REGEXP_REPLACE(v.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g')\r\n     AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)),\r\n\r\n    -- حساب الخصومات (emp_ded)\r\n    (SELECT COALESCE(SUM(de.amount::NUMERIC), 0) FROM emp_ded de \r\n     WHERE REGEXP_REPLACE(de.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g')\r\n     AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)),\r\n\r\n    -- حساب السكن (housing)\r\n    (SELECT COALESCE(SUM(h.amount::NUMERIC), 0) FROM housing h \r\n     WHERE REGEXP_REPLACE(h.emp_name, '\\s+', '', 'g') = REGEXP_REPLACE(a.emp_name, '\\s+', '', 'g'))\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY CASE WHEN a.emp_id ~ '^\\d+$' THEN a.emp_id::INTEGER ELSE 999 END ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_final_v11",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- 1. الإنتاج (daily_report)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 2. أيام العمل (daily_report)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 3. الحضور (daily_report)\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- 4. السلف (emp_adv)\r\n    COALESCE((SELECT SUM(v.amount::NUMERIC) FROM emp_adv v \r\n      WHERE REPLACE(v.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- 5. الخصومات (emp_ded)\r\n    COALESCE((SELECT SUM(de.amount::NUMERIC) FROM emp_ded de \r\n      WHERE REPLACE(de.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0),\r\n\r\n    -- 6. السكن (housing)\r\n    COALESCE((SELECT SUM(h.amount::NUMERIC) FROM housing h \r\n      WHERE REPLACE(h.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY CASE WHEN a.emp_id ~ '^\\d+$' THEN a.emp_id::INTEGER ELSE 999 END ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_final_v12",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id::TEXT,\r\n    a.emp_name,\r\n    COALESCE(a.job_title, '') as job_title,\r\n    \r\n    -- 1. الإنتاج: حذف المسافات من الاسم لضمان الربط\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.prod::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 2. أيام العمل (d_w)\r\n    COALESCE((SELECT SUM(NULLIF(REGEXP_REPLACE(d.d_w::TEXT, '[^0-9.]', '', 'g'), '')::NUMERIC)\r\n      FROM daily_report d WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0),\r\n\r\n    -- 3. الحضور\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n      WHERE REPLACE(d.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (d.attendance::TEXT = '1' OR d.attendance::TEXT ILIKE '%حاضر%')\r\n      AND (p_start_date = '' OR d.date >= p_start_date) AND (p_end_date = '' OR d.date <= p_end_date)), 0)::BIGINT,\r\n\r\n    -- 4. السلف (emp_adv)\r\n    COALESCE((SELECT SUM(v.amount::NUMERIC) FROM emp_adv v \r\n      WHERE REPLACE(v.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR v.date >= p_start_date) AND (p_end_date = '' OR v.date <= p_end_date)), 0),\r\n\r\n    -- 5. الخصومات (emp_ded)\r\n    COALESCE((SELECT SUM(de.amount::NUMERIC) FROM emp_ded de \r\n      WHERE REPLACE(de.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')\r\n      AND (p_start_date = '' OR de.date >= p_start_date) AND (p_end_date = '' OR de.date <= p_end_date)), 0),\r\n\r\n    -- 6. السكن (housing)\r\n    COALESCE((SELECT SUM(h.amount::NUMERIC) FROM housing h \r\n      WHERE REPLACE(h.emp_name, ' ', '') = REPLACE(a.emp_name, ' ', '')), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY CASE WHEN a.emp_id ~ '^\\d+$' THEN a.emp_id::INTEGER ELSE 999 END ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_delete_material_issue",
    "function_code": "\r\nBEGIN\r\n  -- 1. فك الترحيل أولاً (لمسح القيود المحاسبية وتجنب أخطاء الدفاتر)\r\n  PERFORM public.rpc_unpost_material_issue(p_id);\r\n  \r\n  -- 2. مسح إذن الصرف (سيتم مسح الأسطر التابعة له تلقائياً بسبب CASCADE)\r\n  DELETE FROM public.material_issues WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "check_user_permission",
    "function_code": "\r\nBEGIN\r\n  RETURN (\r\n    SELECT \r\n      COALESCE((permissions->module_id->>action_id)::boolean, false)\r\n    FROM public.profiles\r\n    WHERE id = auth.uid()\r\n    OR role = 'admin' -- الآدمن مسموح له بكل شيء\r\n  );\r\nEND;\r\n"
  },
  {
    "function_name": "post_receipts_bulk",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_header_id UUID;\r\nBEGIN\r\n    FOR v_record IN \r\n        SELECT * FROM receipt_vouchers WHERE id = ANY(p_ids) AND status != 'مُعتمد'\r\n    LOOP\r\n        INSERT INTO journal_headers (entry_date, description, reference_id, v_type, status)\r\n        VALUES (v_record.date, 'سند قبض رقم: ' || v_record.receipt_number, v_record.id, 'سند قبض', 'posted')\r\n        RETURNING id INTO v_header_id;\r\n\r\n        -- المدين: الصندوق (لا يرتبط بالعميل NULL)\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (v_header_id, v_record.safe_bank_acc_id, v_record.amount, 0, NULL, 'تحصيل نقدية');\r\n\r\n        -- الدائن: حساب العميل (يرتبط بالعميل لخفيض مديونيته)\r\n        INSERT INTO journal_lines (header_id, account_id, debit, credit, partner_id, notes)\r\n        VALUES (v_header_id, v_record.partner_acc_id, 0, v_record.amount, v_record.partner_id, 'سداد من الحساب');\r\n\r\n        UPDATE receipt_vouchers SET status = 'مُعتمد' WHERE id = v_record.id;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "delete_receipts_bulk",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\nBEGIN\r\n    -- 1. تحديث المبالغ المدفوعة في الفواتير المرتبطة (خصم المبالغ قبل حذف السندات)\r\n    FOR v_rec IN \r\n        SELECT invoice_id, SUM(amount) as total_to_subtract \r\n        FROM receipt_vouchers \r\n        WHERE id = ANY(p_ids) AND invoice_id IS NOT NULL\r\n        GROUP BY invoice_id\r\n    LOOP\r\n        UPDATE invoices \r\n        SET paid_amount = COALESCE(paid_amount, 0) - v_rec.total_to_subtract\r\n        WHERE id = v_rec.invoice_id;\r\n    END LOOP;\r\n\r\n    -- 2. مسح قيود اليومية المرتبطة بالسندات\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n\r\n    -- 3. مسح سندات القبض نهائياً\r\n    DELETE FROM receipt_vouchers WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_receipts_bulk",
    "function_code": "\r\nBEGIN\r\n    -- 1. حذف قيود اليومية المرتبطة بالسندات (عشان نلغي أثرها المحاسبي)\r\n    DELETE FROM journal_headers \r\n    WHERE reference_id = ANY(p_ids);\r\n    \r\n    -- 2. إرجاع حالة السندات إلى 'مسودة' لتمكين التعديل عليها مرة أخرى\r\n    -- تم إزالة العمود is_posted لأنه غير موجود في الجدول\r\n    UPDATE receipt_vouchers \r\n    SET status = 'مسودة' \r\n    WHERE id = ANY(p_ids);\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_unpost_material_issue",
    "function_code": "\r\nDECLARE\r\n  v_jv UUID;\r\nBEGIN\r\n  -- الحصول على رقم القيد المربوط بإذن الصرف\r\n  SELECT jv_id INTO v_jv FROM public.material_issues WHERE id = p_id;\r\n  \r\n  -- تصفير الربط في إذن الصرف وإعادته لحالة (مسودة) أولاً لمنع أخطاء الـ Foreign Key\r\n  UPDATE public.material_issues \r\n  SET is_posted = false, jv_id = NULL \r\n  WHERE id = p_id;\r\n\r\n  IF v_jv IS NOT NULL THEN\r\n    -- مسح سطور القيد المحاسبي\r\n    DELETE FROM public.journal_lines WHERE header_id = v_jv;\r\n    -- مسح رأس القيد المحاسبي\r\n    DELETE FROM public.journal_headers WHERE id = v_jv;\r\n  END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "update_transaction_links",
    "function_code": "\r\nBEGIN\r\n    EXECUTE format(\r\n        'UPDATE %I SET \r\n            project_id = COALESCE($1, project_id), \r\n            payee_id = COALESCE($2, payee_id), \r\n            creditor_account_id = COALESCE($3, creditor_account_id)\r\n         WHERE id = $4',\r\n        target_table\r\n    ) USING p_project_id, p_partner_id, p_account_id, row_id;\r\nEND;\r\n"
  },
  {
    "function_name": "get_accounts_report",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    WITH RECURSIVE \r\n    -- 1️⃣ تجميع حركات الحسابات من جدول القيود (الأسطر) مع فلترة التاريخ والحالة\r\n    account_activity AS (\r\n        SELECT \r\n            l.account_id,\r\n            SUM(l.debit) as own_debit,\r\n            SUM(l.credit) as own_credit\r\n        FROM journal_lines l\r\n        JOIN journal_headers h ON l.header_id = h.id\r\n        WHERE h.status = 'posted'\r\n          AND h.entry_date BETWEEN p_date_from AND p_date_to\r\n        GROUP BY l.account_id\r\n    ),\r\n    -- 2️⃣ بناء هيكل الشجرة (Recursive CTE)\r\n    tree AS (\r\n        SELECT \r\n            a.id, \r\n            a.code, \r\n            a.name, \r\n            a.parent_id, \r\n            a.is_transactional, \r\n            a.account_type,\r\n            a.id as root_id -- لمعرفة تبعية الأبناء للأباء في التجميع\r\n        FROM accounts a\r\n        \r\n        UNION ALL\r\n        \r\n        SELECT \r\n            a.id, \r\n            a.code, \r\n            a.name, \r\n            a.parent_id, \r\n            a.is_transactional, \r\n            a.account_type,\r\n            t.root_id\r\n        FROM accounts a\r\n        JOIN tree t ON a.parent_id = t.id\r\n    ),\r\n    -- 3️⃣ تجميع مبالغ الأبناء وصبها في الآباء\r\n    aggregated_data AS (\r\n        SELECT \r\n            t.root_id as acc_id,\r\n            SUM(COALESCE(act.own_debit, 0)) as total_d,\r\n            SUM(COALESCE(act.own_credit, 0)) as total_c\r\n        FROM tree t\r\n        LEFT JOIN account_activity act ON t.id = act.account_id\r\n        GROUP BY t.root_id\r\n    )\r\n    -- 4️⃣ النتيجة النهائية مرتبطة ببيانات الحساب الأساسية\r\n    SELECT \r\n        a.id,\r\n        a.code,\r\n        a.name,\r\n        a.parent_id,\r\n        a.is_transactional,\r\n        a.account_type,\r\n        COALESCE(ad.total_d, 0) as total_debit,\r\n        COALESCE(ad.total_c, 0) as total_credit,\r\n        (COALESCE(ad.total_d, 0) - COALESCE(ad.total_c, 0)) as balance\r\n    FROM accounts a\r\n    LEFT JOIN aggregated_data ad ON a.id = ad.acc_id\r\n    ORDER BY a.code ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "bulk_disburse_optimized",
    "function_code": "\r\nBEGIN\r\n    -- 1. إنشاء رؤوس السندات لكل المصروفات بضربة واحدة\r\n    -- باستخدام (INSERT INTO ... SELECT) نتجنب الـ Loops\r\n    WITH inserted_vouchers AS (\r\n        INSERT INTO public.payment_vouchers (\r\n            voucher_number, amount, partner_id, debit_account_id, credit_account_id, \r\n            description, status, related_expense_id, site_ref\r\n        )\r\n        SELECT \r\n            'PV-' || to_char(now(), 'YYMMDD') || '-' || substring(id::text, 1, 5),\r\n            (total_price + COALESCE(vat_amount, 0) - COALESCE(discount_amount, 0) - paid_amount),\r\n            payee_id,\r\n            -- هنا يجب وضع منطق جلب حساب المدين (مثلاً من الـ payment_account النصي)\r\n            (SELECT id FROM accounts WHERE name = e.payment_account LIMIT 1),\r\n            '21b8a1db-bc9f-4cf8-b741-1efeded0963c', -- الخزينة\r\n            'سداد مجمع: ' || description,\r\n            'مرحل',\r\n            id,\r\n            site_ref\r\n        FROM public.expenses e\r\n        WHERE id = ANY(p_expense_ids) \r\n        AND (total_price + COALESCE(vat_amount, 0) - COALESCE(discount_amount, 0)) > paid_amount\r\n        RETURNING id, related_expense_id, amount\r\n    )\r\n    -- 2. تحديث المصروفات بالأرقام الجديدة بضربة واحدة\r\n    UPDATE public.expenses\r\n    SET paid_amount = paid_amount + iv.amount\r\n    FROM inserted_vouchers iv\r\n    WHERE public.expenses.id = iv.related_expense_id;\r\n\r\n    -- 3. ترحيل القيود (Journal) يمكن استدعاؤه هنا أيضاً بطريقة مجمعة\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_material_cost",
    "function_code": "\r\nBEGIN\r\n    -- 🟢 أ: في حالة إضافة صنف (INSERT) أو تعديل سعر/بند (UPDATE)\r\n    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN\r\n        IF NEW.boq_id IS NOT NULL THEN\r\n            UPDATE public.boq_budget\r\n            SET actual_material_cost = (\r\n                SELECT COALESCE(SUM(total_price), 0)\r\n                FROM public.material_issue_lines\r\n                WHERE boq_id = NEW.boq_id\r\n            )\r\n            WHERE id = NEW.boq_id;\r\n        END IF;\r\n    END IF;\r\n\r\n    -- 🔴 ب: في حالة حذف صنف (DELETE) أو نقل الصنف لبند آخر في المقايسة\r\n    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN\r\n        IF OLD.boq_id IS NOT NULL THEN\r\n            -- يشتغل فقط في الحذف، أو لو التعديل غيّر الـ boq_id القديم فعلياً\r\n            IF (TG_OP = 'DELETE' OR OLD.boq_id != NEW.boq_id) THEN\r\n                UPDATE public.boq_budget\r\n                SET actual_material_cost = (\r\n                    SELECT COALESCE(SUM(total_price), 0)\r\n                    FROM public.material_issue_lines\r\n                    WHERE boq_id = OLD.boq_id\r\n                )\r\n                WHERE id = OLD.boq_id;\r\n            END IF;\r\n        END IF;\r\n    END IF;\r\n\r\n    -- إتمام العملية بأمان\r\n    IF (TG_OP = 'DELETE') THEN\r\n        RETURN OLD;\r\n    ELSE\r\n        RETURN NEW;\r\n    END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "safe_numeric",
    "function_code": "\r\nBEGIN\r\n    RETURN COALESCE(NULLIF(regexp_replace(val, '[^-0-9.]', '', 'g'), ''), '0')::numeric;\r\nEXCEPTION WHEN OTHERS THEN\r\n    RETURN 0;\r\nEND;\r\n"
  },
  {
    "function_name": "safe_numeric",
    "function_code": "\r\nBEGIN\r\n    RETURN val::numeric;\r\nEXCEPTION WHEN OTHERS THEN\r\n    RETURN 0;\r\nEND;\r\n"
  },
  {
    "function_name": "fix_historical_expense_journals",
    "function_code": "\r\nDECLARE\r\n    v_updated_headers INT := 0;\r\n    v_updated_lines INT := 0;\r\nBEGIN\r\n    -- 1️⃣ تحديث سطور المدين (تنزيل ID المقاول في ذمته)\r\n    UPDATE public.journal_lines jl\r\n    SET partner_id = e.payee_id\r\n    FROM public.journal_headers jh\r\n    JOIN public.expenses e ON e.id = jh.reference_id\r\n    WHERE jl.header_id = jh.id\r\n      AND jl.debit > 0  -- 🚀 شرط الطرف المدين فقط\r\n      AND e.payee_id IS NOT NULL; -- نضمن إن المصروف مربوط بمقاول أصلاً\r\n\r\n    GET DIAGNOSTICS v_updated_lines = ROW_COUNT;\r\n\r\n    -- 2️⃣ تحديث سطور الدائن (تفريغ ذمة الشركة لتبقى نظيفة تماماً)\r\n    UPDATE public.journal_lines jl\r\n    SET partner_id = NULL\r\n    FROM public.journal_headers jh\r\n    JOIN public.expenses e ON e.id = jh.reference_id\r\n    WHERE jl.header_id = jh.id\r\n      AND jl.credit > 0; -- 🚀 شرط الطرف الدائن فقط\r\n\r\n    RETURN jsonb_build_object(\r\n        'success', true,\r\n        'message', 'تمت عملية تصحيح القيود التاريخية بنجاح 🎯',\r\n        'updated_debit_lines_count', v_updated_lines\r\n    );\r\n\r\nEXCEPTION WHEN OTHERS THEN\r\n    RETURN jsonb_build_object(\r\n        'success', false,\r\n        'error', SQLERRM\r\n    );\r\nEND;\r\n"
  },
  {
    "function_name": "check_is_admin",
    "function_code": "\r\n  SELECT is_admin FROM public.profiles WHERE id = auth.uid();\r\n"
  },
  {
    "function_name": "rpc_post_material_claim",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\n    v_jv_id UUID;\r\n    \r\n    -- 🚀 الحسابات المعتمدة بالـ UUIDs المطابقة لشجرة حسابات شركتك الحقيقية بالمللي\r\n    v_project_account     UUID := 'da2d6fcd-ef45-41f4-a8d1-a498b6954002'; -- كود 513: تكاليف مقاولين باطن\r\n    v_contractor_account  UUID := '27f37adf-c0ec-4b40-80d0-2b36b853fd4b'; -- كود 212: التزام مقاولي الباطن (المقاول الجاري)\r\n    v_retention_account   UUID := '1e370e5b-4357-41a4-9271-7c98f9864205'; -- كود 213: تأمينات محتجزة لمقاولي الباطن (الضمان)\r\n    v_advance_account     UUID := '39f878cd-dc58-4a2a-a199-50f6fca983d4'; -- كود 216: سلف مقاولين\r\n    v_other_deduct_acc    UUID := '25998af5-dca4-4512-8f1a-3d0f9c6b8e98'; -- كود 46: إيراد خصومات وجزاءات\r\n    \r\n    -- 📦 حساب المخزون الحقيقي من ملف الـ SQL الخاص بك\r\n    v_materials_inventory UUID := 'c5efa035-c8d5-4d13-bf33-7c7cd854f393'; -- كود 126: مخزون الخامات والمواد (الذي يجب أن ينزل)\r\nBEGIN\r\n    -- 1. جلب بيانات المستخلص بالكامل من الجدول\r\n    SELECT sc.*, p.name as contractor_name\r\n    FROM public.sub_claims sc\r\n    JOIN public.partners p ON sc.contractor_id = p.id\r\n    WHERE sc.id = p_id INTO v_rec;\r\n\r\n    IF v_rec.id IS NULL THEN \r\n        RAISE EXCEPTION 'خطأ: المستخلص غير موجود في النظام!'; \r\n    END IF;\r\n\r\n    IF v_rec.is_posted THEN \r\n        RAISE EXCEPTION 'تنبيه: هذا المستخلص مرحل مسبقاً!'; \r\n    END IF;\r\n\r\n    -- 2. إنشاء رأس القيد في الجورنال\r\n    INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)\r\n    VALUES (\r\n        v_rec.date, \r\n        'مستخلص أعمال رقم: ' || COALESCE(v_rec.claim_number, '') || ' - المقاول: ' || v_rec.contractor_name, \r\n        'posted', \r\n        'مستخلص', \r\n        v_rec.id\r\n    ) RETURNING id INTO v_jv_id;\r\n\r\n    -- 3. [الطرف المدين] إثبات قيمة التكلفة الكاملة للأعمال (حساب التكاليف 513)\r\n    INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n    VALUES (v_jv_id, v_project_account, NULL, v_rec.project_id, COALESCE(v_rec.total_amount, 0), 0, 'قيمة أعمال منفذة مستخلص ' || v_rec.claim_number);\r\n\r\n    -- 4. [الطرف الدائن] الصافي المستحق الفعلي للمقاول كاش (نأخذه جاهزاً من الجدول دون تعديل لحماية الحسبة)\r\n    IF COALESCE(v_rec.net_amount, 0) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_contractor_account, v_rec.contractor_id, v_rec.project_id, 0, v_rec.net_amount, 'الصافي المستحق للمقاول مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    -- 5. [الطرف الدائن] 🎯 خفض المخزن بقيمة الخامات المستقطعة (كود 126) ليقفل الحساب فوراً\r\n    IF COALESCE(v_rec.materials_deduction, 0) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_materials_inventory, v_rec.contractor_id, v_rec.project_id, 0, v_rec.materials_deduction, 'إقفال وتخفيض خامات منصرفة مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    -- 6. [الطرف الدائن] محتجز ضمان الأعمال (حساب 213)\r\n    IF COALESCE(v_rec.retention_amount, 0) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_retention_account, v_rec.contractor_id, v_rec.project_id, 0, v_rec.retention_amount, 'حجز ضمان أعمال مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    -- 7. [الطرف الدائن] استرداد السلف والدفعات المقدمة (حساب 216)\r\n    IF COALESCE(v_rec.advance_payment, 0) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_advance_account, v_rec.contractor_id, v_rec.project_id, 0, v_rec.advance_payment, 'استرداد دفعة مقدمة مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    -- 8. [الطرف الدائن] الجزاءات والخصومات الأخرى (حساب الإيرادات 46)\r\n    IF (COALESCE(v_rec.deductions_amount, 0) + COALESCE(v_rec.other_deductions, 0)) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_other_deduct_acc, v_rec.contractor_id, v_rec.project_id, 0, (COALESCE(v_rec.deductions_amount, 0) + COALESCE(v_rec.other_deductions, 0)), 'خصومات وجزاءات مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    -- 9. تحديث حالة المستخلص وربطه بالقيد نهائياً وتأكيد الترحيل\r\n    UPDATE public.sub_claims \r\n    SET is_posted = true, \r\n        status = 'مُعتمد ومُرحل', \r\n        jv_header_id = v_jv_id, \r\n        jv_id = v_jv_id\r\n    WHERE id = p_id;\r\n\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_advances",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    v.id,\r\n    v.emp_name,\r\n    COALESCE(v.site, ''),\r\n    -- تحويل المبلغ لرقم عشري بأمان\r\n    CASE \r\n      WHEN v.amount ~ '^[0-9.]+$' THEN v.amount::NUMERIC \r\n      ELSE 0 \r\n    END as amount,\r\n    v.date::TEXT,\r\n    COALESCE(v.notes, '')\r\n  FROM emp_adv v\r\n  WHERE \r\n    (p_search_name = '' OR v.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (\r\n      (p_start_date = '' OR v.date >= p_start_date)\r\n      AND (p_end_date = '' OR v.date <= p_end_date)\r\n    )\r\n  ORDER BY v.date DESC, v.id DESC;\r\nEND; "
  },
  {
    "function_name": "get_all_advances_v4",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    -- لو عندك عمود اسمه ID كبيتال جربه، لو مفيش خالص ctid ده رقم الصف في الداتابيز\r\n    COALESCE(t.id::TEXT, t.ctid::TEXT), \r\n    COALESCE(t.emp_name, '')::TEXT,\r\n    COALESCE(t.amount, 0)::FLOAT8,\r\n    t.date::TEXT,\r\n    COALESCE(t.notes, '')::TEXT\r\n  FROM emp_adv t\r\n  WHERE \r\n    (p_search_name = '' OR t.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (\r\n      (p_start_date = '' OR t.date >= p_start_date)\r\n      AND (p_end_date = '' OR t.date <= p_end_date)\r\n    )\r\n  ORDER BY t.date DESC;\r\nEND; "
  },
  {
    "function_name": "link_record_to_project",
    "function_code": "\r\nBEGIN\r\n    EXECUTE format(\r\n        'UPDATE %I SET \r\n            project_id = %L, \r\n            payee_id = CASE WHEN %L IS NULL THEN payee_id ELSE %L END,\r\n            creditor_account_id = CASE WHEN %L IS NULL THEN creditor_account_id ELSE %L END\r\n         WHERE id = %L',\r\n        target_table, p_project_id, p_partner_id, p_partner_id, p_account_id, p_account_id, record_id\r\n    );\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_employees_data",
    "function_code": "\r\nDECLARE\r\n  v_start DATE;\r\n  v_end DATE;\r\nBEGIN\r\n  -- 1. تجهيز تواريخ الفلتر بأمان\r\n  v_start := CASE WHEN NULLIF(p_start_date, '') IS NULL THEN '1900-01-01'::DATE ELSE p_start_date::DATE END;\r\n  v_end := CASE WHEN NULLIF(p_end_date, '') IS NULL THEN '2099-12-31'::DATE ELSE p_end_date::DATE END;\r\n\r\n  RETURN QUERY\r\n  SELECT \r\n    a.emp_id, a.emp_name, COALESCE(a.job_title, ''),\r\n    \r\n    -- المستحق (daily_report) - فيه تاريخ\r\n    COALESCE((SELECT SUM(safe_numeric(d.d_w)) FROM daily_report d \r\n              WHERE regexp_replace(d.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')\r\n              AND (NULLIF(d.date, '')::DATE >= v_start AND NULLIF(d.date, '')::DATE <= v_end)), 0),\r\n    \r\n    -- أيام الدوام (daily_report) - فيه تاريخ\r\n    COALESCE((SELECT SUM(safe_numeric(d.attendance)) FROM daily_report d \r\n              WHERE regexp_replace(d.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')\r\n              AND (NULLIF(d.date, '')::DATE >= v_start AND NULLIF(d.date, '')::DATE <= v_end)), 0),\r\n    \r\n    -- عدد الحضور\r\n    COALESCE((SELECT COUNT(*) FROM daily_report d \r\n              WHERE regexp_replace(d.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')\r\n              AND safe_numeric(d.attendance) > 0\r\n              AND (NULLIF(d.date, '')::DATE >= v_start AND NULLIF(d.date, '')::DATE <= v_end)), 0)::BIGINT,\r\n    \r\n    -- المستلم (emp_adv) - فيه تاريخ\r\n    COALESCE((SELECT SUM(safe_numeric(v.amount)) FROM emp_adv v \r\n              WHERE regexp_replace(v.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')\r\n              AND (NULLIF(v.date, '')::DATE >= v_start AND NULLIF(v.date, '')::DATE <= v_end)), 0),\r\n              \r\n    -- الخصومات (emp_ded) - فيه تاريخ\r\n    COALESCE((SELECT SUM(safe_numeric(de.amount)) FROM emp_ded de \r\n              WHERE regexp_replace(de.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')\r\n              AND (NULLIF(de.date, '')::DATE >= v_start AND NULLIF(de.date, '')::DATE <= v_end)), 0),\r\n              \r\n    -- السكن (housing) - تم إزالة فلتر التاريخ لأنه غير موجود بالجدول\r\n    COALESCE((SELECT SUM(safe_numeric(h.amount)) FROM housing h \r\n              WHERE regexp_replace(h.emp_name, '\\s+', '', 'g') = regexp_replace(a.emp_name, '\\s+', '', 'g')), 0)\r\n\r\n  FROM all_emp a\r\n  WHERE (p_search_name = '' OR a.emp_name ILIKE '%' || p_search_name || '%')\r\n  ORDER BY a.emp_id ASC;\r\nEND; "
  },
  {
    "function_name": "get_all_advances_v2",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    t.id,\r\n    t.emp_name::TEXT,\r\n    COALESCE(t.site, '')::TEXT,\r\n    -- التأكد من تحويل المبلغ لرقم صحيح للحسابات\r\n    CASE \r\n      WHEN t.amount ~ '^[0-9.]+$' THEN t.amount::NUMERIC \r\n      ELSE 0 \r\n    END,\r\n    t.date::TEXT,\r\n    COALESCE(t.notes, '')::TEXT\r\n  FROM emp_adv t\r\n  WHERE \r\n    (p_search_name = '' OR t.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (p_start_date = '' OR t.date >= p_start_date)\r\n    AND (p_end_date = '' OR t.date <= p_end_date)\r\n  ORDER BY t.date DESC, t.id DESC;\r\nEND; "
  },
  {
    "function_name": "get_safe_advances",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    id,\r\n    emp_name::TEXT,\r\n    -- تحويل آمن: لو النص مش رقم، يحطه 0 بدل ما يضرب Error\r\n    CASE \r\n      WHEN amount ~ '^[0-9.]+$' THEN amount::NUMERIC \r\n      ELSE 0 \r\n    END,\r\n    -- تحويل التاريخ: لو النص مش تاريخ صح، يحط تاريخ قديم\r\n    CASE \r\n      WHEN date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN date::DATE \r\n      ELSE '1900-01-01'::DATE \r\n    END\r\n  FROM emp_adv;\r\nEND; "
  },
  {
    "function_name": "get_project_dashboard",
    "function_code": "\r\nDECLARE\r\n    v_total_general_labor_cost numeric; v_total_labor_logs numeric;\r\nBEGIN\r\n    SELECT COALESCE(SUM(COALESCE(NULLIF(ex.paid_amount, 0), ex.total_price, 0)), 0) INTO v_total_general_labor_cost FROM public.expenses ex WHERE ex.project_id IS NULL AND (ex.main_category LIKE '%عمال%' OR ex.main_category LIKE '%رواتب%' OR ex.main_category LIKE '%أجور%');\r\n    SELECT COALESCE(SUM(attendance_value), 1) INTO v_total_labor_logs FROM public.labor_daily_logs;\r\n    IF v_total_labor_logs <= 0 THEN v_total_labor_logs := 1; END IF;\r\n\r\n    RETURN QUERY\r\n    WITH MaterialCosts AS (\r\n        SELECT mi.project_id, SUM(mil.total_price) as material_cost FROM public.material_issues mi JOIN public.material_issue_lines mil ON mi.id = mil.issue_id GROUP BY mi.project_id\r\n    ),\r\n    DirectExpenses AS (\r\n        SELECT ex_dir.project_id, SUM(COALESCE(NULLIF(ex_dir.paid_amount, 0), ex_dir.total_price, 0)) as exp_cost FROM public.expenses ex_dir WHERE ex_dir.project_id IS NOT NULL GROUP BY ex_dir.project_id\r\n    ),\r\n    LaborLogs AS (\r\n        SELECT ldl.project_id, SUM(ldl.attendance_value) as project_workers, SUM(COALESCE(ldl.attendance_value, 0) * COALESCE(ldl.daily_wage, 0)) as direct_labor FROM public.labor_daily_logs ldl GROUP BY ldl.project_id\r\n    ),\r\n    Subcontractors AS (\r\n        SELECT sub_union.project_id, jsonb_agg(DISTINCT sub_union.sub_name) as subs FROM (\r\n            SELECT e.project_id, p.name as sub_name FROM public.expenses e JOIN public.partners p ON e.payee_id = p.id WHERE e.project_id IS NOT NULL\r\n            UNION SELECT m.project_id, p.name as sub_name FROM public.material_issues m JOIN public.partners p ON m.subcontractor_id = p.id WHERE m.project_id IS NOT NULL\r\n            UNION SELECT ca.project_id, p.name as sub_name FROM public.contractor_assignments ca JOIN public.partners p ON ca.contractor_id = p.id WHERE ca.project_id IS NOT NULL\r\n        ) sub_union WHERE sub_name IS NOT NULL GROUP BY sub_union.project_id\r\n    ),\r\n    BOQStats AS (\r\n        SELECT \r\n            b.project_id, COALESCE(AVG(b.completed_percentage), 0) as avg_completion,\r\n            SUM(COALESCE(b.contract_quantity, 0) * COALESCE(b.unit_contract_price, 0)) as boq_contract_value,\r\n            SUM(COALESCE(b.estimated_labor_cost, 0) + COALESCE(b.estimated_material_cost, 0) + COALESCE(b.estimated_expenses_cost, 0)) as boq_estimated_budget\r\n        FROM public.boq_budget b\r\n        WHERE NOT EXISTS (SELECT 1 FROM public.boq_budget child WHERE child.parent_id = b.id)\r\n        GROUP BY b.project_id\r\n    )\r\n    SELECT \r\n        p.id, p.\"Property\"::text, p.client_name::text, p.status::text,\r\n        COALESCE(NULLIF(bs.boq_contract_value, 0), p.contract_value, 0) as contract_value,\r\n        COALESCE(NULLIF(bs.boq_estimated_budget, 0), p.estimated_budget, 0) as estimated_budget,\r\n        COALESCE(mc.material_cost, 0) as total_material_cost, COALESCE(de.exp_cost, 0) as total_direct_expenses, COALESCE(ll.direct_labor, 0) as direct_labor_cost, \r\n        ROUND((COALESCE(ll.project_workers, 0)::numeric / v_total_labor_logs) * v_total_general_labor_cost, 2) as allocated_labor_cost, \r\n        (COALESCE(mc.material_cost, 0) + COALESCE(de.exp_cost, 0) + COALESCE(ll.direct_labor, 0) + ROUND((COALESCE(ll.project_workers, 0)::numeric / v_total_labor_logs) * v_total_general_labor_cost, 2)) as total_cost,\r\n        COALESCE(s.subs, '[]'::jsonb) as subcontractors, COALESCE(bs.avg_completion, 0) as overall_completion_percentage\r\n    FROM public.projects p\r\n    LEFT JOIN MaterialCosts mc ON p.id = mc.project_id\r\n    LEFT JOIN DirectExpenses de ON p.id = de.project_id\r\n    LEFT JOIN LaborLogs ll ON p.id = ll.project_id\r\n    LEFT JOIN Subcontractors s ON p.id = s.project_id\r\n    LEFT JOIN BOQStats bs ON p.id = bs.project_id;\r\nEND;\r\n"
  },
  {
    "function_name": "maintain_material_receipt_boq_id",
    "function_code": "\r\nBEGIN\r\n    -- التأكد من وجود الخامة والفيلا في السطر قبل البحث\r\n    IF NEW.item_id IS NOT NULL AND NEW.project_id IS NOT NULL THEN\r\n        -- سحب معرف المقايسة (boq_budget.id) بمطابقة الدليل العام مع ميزانية الفيلا المحددة\r\n        SELECT b.id INTO NEW.boq_item_id\r\n        FROM public.boq_budget b\r\n        JOIN public.material_items mi ON b.boq_item_id = mi.boq_item_id\r\n        WHERE mi.id = NEW.item_id \r\n          AND b.project_id = NEW.project_id\r\n        LIMIT 1;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "get_all_advances_v3",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    e.ctid::TEXT as generated_id,\r\n    e.date,\r\n    e.emp_name,\r\n    COALESCE(e.amount, 0)::FLOAT,\r\n    e.\"Desc\",\r\n    SUM(COALESCE(e.amount, 0)) OVER()::FLOAT as total_db_sum,\r\n    COUNT(*) OVER() as total_db_count -- بيحسب عدد الصفوف كلها قبل الـ 1000\r\n  FROM emp_adv e\r\n  WHERE \r\n    (p_search_name = '' OR e.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (\r\n      (p_start_date = '' OR e.date >= p_start_date)\r\n      AND \r\n      (p_end_date = '' OR e.date <= p_end_date)\r\n    )\r\n  ORDER BY e.date DESC;\r\nEND; "
  },
  {
    "function_name": "get_comprehensive_dashboard",
    "function_code": "\r\nDECLARE\r\n  -- متغيرات المصروفات\r\n  exp_posted NUMERIC;\r\n  exp_pending NUMERIC;\r\n  \r\n  -- متغيرات سندات الصرف\r\n  pv_posted NUMERIC;\r\n  pv_pending NUMERIC;\r\n  \r\n  -- متغيرات سندات القبض\r\n  rv_posted NUMERIC;\r\n  rv_pending NUMERIC;\r\n  \r\n  -- متغيرات الفواتير\r\n  inv_posted NUMERIC;\r\n  inv_pending NUMERIC;\r\n  \r\n  -- متغيرات العمالة والموظفين\r\n  labor_posted NUMERIC;\r\n  labor_pending NUMERIC;\r\n  advances NUMERIC;\r\n  deductions NUMERIC;\r\n  violations_amt NUMERIC;\r\n\r\nBEGIN\r\n  -- 1. المصروفات (expenses)\r\n  SELECT COALESCE(SUM(total_price), 0) INTO exp_posted FROM expenses WHERE is_posted = true AND exp_date BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(total_price), 0) INTO exp_pending FROM expenses WHERE is_posted = false AND exp_date BETWEEN start_date AND end_date;\r\n\r\n  -- 2. سندات الصرف (payment_vouchers)\r\n  SELECT COALESCE(SUM(amount), 0) INTO pv_posted FROM payment_vouchers WHERE is_posted = true AND date BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(amount), 0) INTO pv_pending FROM payment_vouchers WHERE is_posted = false AND date BETWEEN start_date AND end_date;\r\n\r\n  -- 3. سندات القبض (receipt_vouchers)\r\n  -- ملاحظة: سندات القبض عندك بتعتمد على حقل status (معلق/مرحل أو مسودة/مرحل)، افترضنا هنا 'مرحل'\r\n  SELECT COALESCE(SUM(amount), 0) INTO rv_posted FROM receipt_vouchers WHERE status = 'مرحل' AND date BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(amount), 0) INTO rv_pending FROM receipt_vouchers WHERE status != 'مرحل' AND date BETWEEN start_date AND end_date;\r\n\r\n  -- 4. فواتير العملاء (invoices)\r\n  SELECT COALESCE(SUM(total_amount), 0) INTO inv_posted FROM invoices WHERE status = 'مرحل' AND date BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(total_amount), 0) INTO inv_pending FROM invoices WHERE status != 'مرحل' AND date BETWEEN start_date AND end_date;\r\n\r\n  -- 5. يوميات العمال (labor_daily_logs)\r\n  SELECT COALESCE(SUM(daily_wage * attendance_value), 0) INTO labor_posted FROM labor_daily_logs WHERE is_posted = true AND work_date BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(daily_wage * attendance_value), 0) INTO labor_pending FROM labor_daily_logs WHERE is_posted = false AND work_date BETWEEN start_date AND end_date;\r\n\r\n  -- 6. السلف والخصومات والمخالفات\r\n  SELECT COALESCE(SUM(amount), 0) INTO advances FROM emp_adv WHERE is_posted = true AND TO_DATE(date, 'YYYY-MM-DD') BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(amount), 0) INTO deductions FROM emp_ded WHERE is_posted = true AND TO_DATE(date, 'YYYY-MM-DD') BETWEEN start_date AND end_date;\r\n  SELECT COALESCE(SUM(amount), 0) INTO violations_amt FROM violations WHERE is_posted = true AND date BETWEEN start_date AND end_date;\r\n\r\n  -- إرجاع النتيجة ككائن JSON واحد\r\n  RETURN json_build_object(\r\n    'expenses', json_build_object('posted', exp_posted, 'pending', exp_pending, 'total', exp_posted + exp_pending),\r\n    'payment_vouchers', json_build_object('posted', pv_posted, 'pending', pv_pending, 'total', pv_posted + pv_pending),\r\n    'receipt_vouchers', json_build_object('posted', rv_posted, 'pending', rv_pending, 'total', rv_posted + rv_pending),\r\n    'invoices', json_build_object('posted', inv_posted, 'pending', inv_pending, 'total', inv_posted + inv_pending),\r\n    'labor', json_build_object('posted', labor_posted, 'pending', labor_pending, 'total', labor_posted + labor_pending),\r\n    'hr', json_build_object('advances', advances, 'deductions', deductions, 'violations', violations_amt)\r\n  );\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_delete_claim",
    "function_code": "\r\nBEGIN\r\n    -- أ) فك الترحيل ومسح القيود أولاً لو كان مرحل\r\n    PERFORM public.rpc_unpost_claim(p_id);\r\n\r\n    -- ب) تحرير بنود المقايسة لترجع \"جاري التنفيذ\"\r\n    UPDATE public.contractor_assignments \r\n    SET status = 'جاري التنفيذ', claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- ج) تحرير الخامات المنصرفة لترجع تظهر في المستخلصات القادمة\r\n    UPDATE public.material_issues \r\n    SET claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- د) تحرير المصروفات النقدية\r\n    UPDATE public.expenses \r\n    SET is_deducted_in_claim = false, claim_id = NULL \r\n    WHERE claim_id = p_id;\r\n\r\n    -- هـ) أخيراً.. حذف المستخلص نفسه\r\n    DELETE FROM public.sub_claims WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "get_journal_ghosts",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        l.header_id::text,\r\n        MAX(l.created_at)::date as entry_date,\r\n        'سطور يتيمة ملهاش رأس قيد'::text as description,\r\n        SUM(l.debit + l.credit)::numeric as total_amount,\r\n        'Ghost Detected: Lines found without parent Header'::text as diagnosis\r\n    FROM journal_lines l\r\n    LEFT JOIN journal_headers h ON l.header_id = h.id\r\n    WHERE h.id IS NULL\r\n    GROUP BY l.header_id;\r\nEND;\r\n"
  },
  {
    "function_name": "get_housing_services_v1",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    e.ctid::TEXT as generated_id,\r\n    e.emp_name,\r\n    e.deduction_month,\r\n    COALESCE(e.amount, 0)::FLOAT as amount,\r\n    e.service_type,\r\n    e.notes, -- تم التعديل للجمع بناءً على تنبيه سوبابيز الأخير\r\n    SUM(COALESCE(e.amount, 0)) OVER()::FLOAT as total_db_sum\r\n  FROM housing e\r\n  WHERE \r\n    (p_search_name = '' OR e.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (p_service_type = '' OR e.service_type ILIKE '%' || p_service_type || '%')\r\n  ORDER BY e.deduction_month DESC;\r\nEND; "
  },
  {
    "function_name": "handle_new_user",
    "function_code": "\r\nbegin\r\n  insert into public.profiles (id, full_name, role, permissions)\r\n  values (\r\n    new.id,                                      -- بناخد الـ ID السري\r\n    new.raw_user_meta_data->>'full_name',        -- بنسحب الاسم من الميتا داتا\r\n    coalesce(new.raw_user_meta_data->>'role', 'client'), -- الرتبة (لو مفيش هياخد عميل)\r\n    '{}'::jsonb                                  -- بنفتحله سجل صلاحيات فاضي عشان الكود ميضربش\r\n  );\r\n  return new;\r\nend;\r\n"
  },
  {
    "function_name": "get_emp_ded_v1",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    e.id,                -- نستخدم الـ ID الحقيقي هنا\r\n    e.date,\r\n    e.emp_name,\r\n    COALESCE(e.amount, 0)::FLOAT as amount,\r\n    e.reason,\r\n    e.notes,\r\n    SUM(COALESCE(e.amount, 0)) OVER()::FLOAT as total_db_sum\r\n  FROM emp_ded e\r\n  WHERE \r\n    (p_search_name = '' OR e.emp_name ILIKE '%' || p_search_name || '%')\r\n    AND (p_search_date = '' OR e.date ILIKE '%' || p_search_date || '%')\r\n  ORDER BY e.date DESC;\r\nEND; "
  },
  {
    "function_name": "maintain_boq_property_name",
    "function_code": "\r\nBEGIN\r\n    IF NEW.project_id IS NOT NULL THEN\r\n        SELECT \"Property\" INTO NEW.\"Property\"\r\n        FROM public.projects\r\n        WHERE id = NEW.project_id;\r\n    ELSE\r\n        NEW.\"Property\" := NULL;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_labor_cost_live",
    "function_code": "\r\nBEGIN\r\n    IF (TG_OP = 'DELETE') THEN\r\n        UPDATE public.boq_budget\r\n        SET actual_labor_cost = COALESCE((SELECT SUM(daily_wage) FROM public.labor_daily_logs WHERE project_id = OLD.project_id AND work_item_id = OLD.work_item_id), 0)\r\n        WHERE project_id = OLD.project_id AND boq_item_id = OLD.work_item_id;\r\n        RETURN OLD;\r\n    ELSE\r\n        UPDATE public.boq_budget\r\n        SET actual_labor_cost = COALESCE((SELECT SUM(daily_wage) FROM public.labor_daily_logs WHERE project_id = NEW.project_id AND work_item_id = NEW.work_item_id), 0)\r\n        WHERE project_id = NEW.project_id AND boq_item_id = NEW.work_item_id;\r\n        RETURN NEW;\r\n    END IF;\r\nEND;\r\n"
  },
  {
    "function_name": "get_subcontractor_pending_deductions",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    -- 1. الخامات (يجب أن تطابق المقاول والمشروع حصراً)\r\n    SELECT \r\n        'material'::TEXT,\r\n        mil.id,\r\n        mi.issue_date,\r\n        (mil.item_name || ' - كمية: ' || mil.quantity || ' ' || mil.unit)::TEXT,\r\n        mil.total_price\r\n    FROM material_issue_lines mil\r\n    JOIN material_issues mi ON mil.issue_id = mi.id\r\n    WHERE mi.subcontractor_id = p_sub_id \r\n      AND mi.project_id = p_proj_id -- الخامات دايما مرتبطة بمشروع\r\n      AND mi.is_posted = true \r\n      AND mi.subcontractor_invoice_id IS NULL\r\n\r\n    UNION ALL\r\n\r\n    -- 2. المصروفات (لو فيه مشروع لازم يطابق، لو مافيش يسحبها عادي لأي مشروع)\r\n    SELECT \r\n        'expense'::TEXT,\r\n        e.id,\r\n        e.expense_date,\r\n        e.notes::TEXT,\r\n        e.amount\r\n    FROM expenses e\r\n    WHERE e.payee_id = p_sub_id \r\n      AND (e.project_id = p_proj_id OR e.project_id IS NULL) -- 🎯 اللوجيك المطلوب هنا\r\n      AND e.is_posted = true \r\n      AND e.is_subcontractor_charge = true \r\n      AND e.subcontractor_invoice_id IS NULL;\r\nEND;\r\n"
  },
  {
    "function_name": "get_labor_stats",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        COALESCE(SUM(daily_wage), 0)::NUMERIC,\r\n        COALESCE(SUM(attendance_value), 0)::NUMERIC,\r\n        COUNT(production_desc)::BIGINT, -- بيعد الصفوف اللي فيها وصف إنتاجية بس\r\n        COUNT(*)::BIGINT\r\n    FROM public.labor_daily_logs;\r\nEND;\r\n"
  },
  {
    "function_name": "post_sub_claim_to_journal",
    "function_code": "DECLARE\r\n    v_rec RECORD;\r\n    v_jv_id uuid;\r\n    v_project_account uuid := '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'; -- حساب تكاليف المشاريع\r\n    v_contractor_account uuid := '39f878cd-dc58-4a2a-a199-50f6fca983d4'; -- حساب الموردين/المقاولين\r\n    v_retention_account uuid := 'حط_هنا_اي_دي_حساب_محتجز_الضمان'; \r\nBEGIN\r\n    -- 1. جلب بيانات المستخلص بالكامل مع اسم المقاول\r\n    SELECT sc.*, p.name as contractor_name\r\n    FROM public.sub_claims sc\r\n    JOIN public.partners p ON sc.contractor_id = p.id\r\n    WHERE sc.id = claim_id INTO v_rec;\r\n\r\n    IF v_rec.is_posted THEN RAISE EXCEPTION 'هذا المستخلص مرحل بالفعل!'; END IF;\r\n\r\n    -- 2. إنشاء رأس القيد\r\n    INSERT INTO public.journal_headers (\r\n        entry_date, description, status, v_type, reference_id\r\n    ) VALUES (\r\n        v_rec.date,\r\n        'مستخلص أعمال رقم: ' || COALESCE(v_rec.claim_number, '') || ' - المقاول: ' || v_rec.contractor_name,\r\n        'posted',\r\n        'invoices',\r\n        v_rec.id\r\n    ) RETURNING id INTO v_jv_id;\r\n\r\n    -- 3. السطر المدين (إجمالي الأعمال): 🚫 تم وضع NULL لمنع ظهوره في كشف حساب المقاول\r\n    INSERT INTO public.journal_lines (\r\n        header_id, account_id, partner_id, project_id, debit, credit, notes\r\n    ) VALUES (\r\n        v_jv_id, v_project_account, NULL, v_rec.project_id,\r\n        v_rec.total_amount, 0, 'إثبات قيمة الأعمال المنفذة بمستخلص ' || v_rec.claim_number\r\n    );\r\n\r\n    -- 4. السطر الدائن (صافي ذمة المقاول): ✅ هنا فقط يتم رمي آيدي المقاول ليظهر كاستحقاق في كشف حسابه\r\n    INSERT INTO public.journal_lines (\r\n        header_id, account_id, partner_id, project_id, debit, credit, notes\r\n    ) VALUES (\r\n        v_jv_id, v_contractor_account, v_rec.contractor_id, v_rec.project_id,\r\n        0, v_rec.net_amount, 'الصافي المستحق للمقاول بموجب المستخلص'\r\n    );\r\n\r\n    -- 5. السطر الدائن (محتجز الضمان): 🚫 تم وضع NULL لمنع التداخل مع حساب المقاول المباشر\r\n    IF v_rec.retention_amount > 0 THEN\r\n        INSERT INTO public.journal_lines (\r\n            header_id, account_id, partner_id, project_id, debit, credit, notes\r\n        ) VALUES (\r\n            v_jv_id, v_retention_account, NULL, v_rec.project_id,\r\n            0, v_rec.retention_amount, 'حجز ضمان أعمال من مستخلص ' || v_rec.claim_number\r\n        );\r\n    END IF;\r\n\r\n    -- 6. تحديث حالة المستخلص وربطه بالقيد\r\n    UPDATE public.sub_claims \r\n    SET is_posted = true, \r\n        status = 'مُعتمد ومُرحل',\r\n        jv_header_id = v_jv_id \r\n    WHERE id = claim_id;\r\n\r\nEND;"
  },
  {
    "function_name": "get_trial_balance",
    "function_code": "\r\nBEGIN\r\n  RETURN QUERY\r\n  \r\n  WITH opening_balances AS (\r\n      SELECT\r\n          jl.account_id,\r\n          SUM(jl.debit) as op_debit,\r\n          SUM(jl.credit) as op_credit\r\n      FROM public.journal_lines jl\r\n      JOIN public.journal_headers jh ON jl.header_id = jh.id\r\n      WHERE jh.entry_date < p_start_date AND jh.status = 'posted'\r\n      GROUP BY jl.account_id\r\n  ),\r\n  period_transactions AS (\r\n      SELECT\r\n          jl.account_id,\r\n          SUM(jl.debit) as per_debit,\r\n          SUM(jl.credit) as per_credit\r\n      FROM public.journal_lines jl\r\n      JOIN public.journal_headers jh ON jl.header_id = jh.id\r\n      WHERE jh.entry_date >= p_start_date AND jh.entry_date <= p_end_date AND jh.status = 'posted'\r\n      GROUP BY jl.account_id\r\n  )\r\n  \r\n  -- عملية الـ SELECT مع الـ Casting الإجباري لكل عمود\r\n  SELECT\r\n      a.id::uuid as account_id,\r\n      a.code::text as account_code,\r\n      a.name::text as account_name,\r\n      a.account_type::text as account_type,\r\n      a.parent_id::uuid as parent_id,\r\n      \r\n      COALESCE(ob.op_debit, 0::numeric) as opening_debit,\r\n      COALESCE(ob.op_credit, 0::numeric) as opening_credit,\r\n      \r\n      COALESCE(pt.per_debit, 0::numeric) as period_debit,\r\n      COALESCE(pt.per_credit, 0::numeric) as period_credit,\r\n      \r\n      (CASE\r\n          WHEN (COALESCE(ob.op_debit, 0::numeric) + COALESCE(pt.per_debit, 0::numeric)) > (COALESCE(ob.op_credit, 0::numeric) + COALESCE(pt.per_credit, 0::numeric))\r\n          THEN (COALESCE(ob.op_debit, 0::numeric) + COALESCE(pt.per_debit, 0::numeric)) - (COALESCE(ob.op_credit, 0::numeric) + COALESCE(pt.per_credit, 0::numeric))\r\n          ELSE 0::numeric\r\n      END)::numeric as ending_debit,\r\n      \r\n      (CASE\r\n          WHEN (COALESCE(ob.op_credit, 0::numeric) + COALESCE(pt.per_credit, 0::numeric)) > (COALESCE(ob.op_debit, 0::numeric) + COALESCE(pt.per_debit, 0::numeric))\r\n          THEN (COALESCE(ob.op_credit, 0::numeric) + COALESCE(pt.per_credit, 0::numeric)) - (COALESCE(ob.op_debit, 0::numeric) + COALESCE(pt.per_debit, 0::numeric))\r\n          ELSE 0::numeric\r\n      END)::numeric as ending_credit\r\n\r\n  FROM public.accounts a\r\n  LEFT JOIN opening_balances ob ON a.id = ob.account_id\r\n  LEFT JOIN period_transactions pt ON a.id = pt.account_id\r\n  \r\n  WHERE a.is_transactional = true\r\n    AND (\r\n        COALESCE(ob.op_debit, 0) > 0 OR COALESCE(ob.op_credit, 0) > 0 \r\n     OR COALESCE(pt.per_debit, 0) > 0 OR COALESCE(pt.per_credit, 0) > 0\r\n    )\r\n  ORDER BY a.code ASC;\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_material_cost_live",
    "function_code": "\r\nDECLARE\r\n    v_project_id UUID;\r\n    v_boq_item_id UUID;\r\n    v_boq_id UUID;\r\nBEGIN\r\n    IF TG_OP = 'DELETE' THEN\r\n        v_boq_id := OLD.boq_id;\r\n        v_boq_item_id := OLD.boq_item_id;\r\n        SELECT project_id INTO v_project_id FROM public.material_issues WHERE id = OLD.issue_id;\r\n    ELSE\r\n        v_boq_id := NEW.boq_id;\r\n        v_boq_item_id := NEW.boq_item_id;\r\n        SELECT project_id INTO v_project_id FROM public.material_issues WHERE id = NEW.issue_id;\r\n        \r\n        IF v_boq_item_id IS NULL AND NEW.item_id IS NOT NULL THEN\r\n            SELECT boq_item_id INTO v_boq_item_id FROM public.material_items WHERE id = NEW.item_id;\r\n        END IF;\r\n    END IF;\r\n\r\n    -- إذا كان الـ boq_id فارغاً، نربطه أوتوماتيك بالمقايسة الصحيحة\r\n    IF v_boq_id IS NULL AND v_project_id IS NOT NULL AND v_boq_item_id IS NOT NULL THEN\r\n        SELECT id INTO v_boq_id FROM public.boq_budget WHERE project_id = v_project_id AND boq_item_id = v_boq_item_id;\r\n    END IF;\r\n\r\n    -- تحديث الحسبة فوراً\r\n    IF v_boq_id IS NOT NULL THEN\r\n        UPDATE public.boq_budget\r\n        SET actual_material_cost = COALESCE((\r\n            SELECT SUM(mil.total_price)\r\n            FROM public.material_issue_lines mil\r\n            JOIN public.material_issues mi ON mi.id = mil.issue_id\r\n            WHERE mil.boq_id = v_boq_id \r\n               OR (mi.project_id = v_project_id AND mil.boq_item_id = v_boq_item_id)\r\n        ), 0)\r\n        WHERE id = v_boq_id;\r\n    END IF;\r\n\r\n    RETURN NULL;\r\nEND;\r\n"
  },
  {
    "function_name": "update_boq_revenue_from_invoice_live",
    "function_code": "\r\nDECLARE\r\n    v_project_ids UUID[];\r\n    v_pid UUID;\r\nBEGIN\r\n    -- تجميع الـ project_ids المتأثرة بالعملية\r\n    IF TG_OP = 'DELETE' THEN\r\n        v_project_ids := OLD.project_ids;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        v_project_ids := ARRAY(SELECT DISTINCT unnest(OLD.project_ids || NEW.project_ids));\r\n    ELSE\r\n        v_project_ids := NEW.project_ids;\r\n    END IF;\r\n\r\n    -- إعادة الحساب للمشاريع المتأثرة فقط لضمان سرعة السيرفر\r\n    IF v_project_ids IS NOT NULL AND array_length(v_project_ids, 1) > 0 THEN\r\n        FOREACH v_pid IN ARRAY v_project_ids LOOP\r\n            \r\n            UPDATE public.boq_budget b\r\n            SET actual_revenue = COALESCE(\r\n                -- 1) محاولة البحث عن تطابق صريح بالـ boq_id\r\n                (\r\n                    SELECT SUM((line->>'total_price')::numeric)\r\n                    FROM public.invoices i,\r\n                    jsonb_array_elements(i.lines_data) AS line\r\n                    WHERE (i.status LIKE '%عتمد%' OR i.status LIKE '%مدفوع%')\r\n                      AND (line->>'boq_id')::uuid = b.id\r\n                ),\r\n                -- 2) البديل في حال عدم وجود تطابق بالـ ID ولكن العمارة موجودة في الفاتورة\r\n                CASE \r\n                    WHEN EXISTS (\r\n                        SELECT 1 \r\n                        FROM public.invoices i \r\n                        WHERE v_pid = ANY(i.project_ids)\r\n                          AND (i.status LIKE '%عتمد%' OR i.status LIKE '%مدفوع%')\r\n                    ) THEN \r\n                        COALESCE(b.total_contract_amount, (COALESCE(b.contract_quantity, 0) * COALESCE(b.unit_contract_price, 0))) \r\n                        - COALESCE(b.actual_retention_amount, 0)\r\n                    ELSE 0\r\n                END\r\n            )\r\n            WHERE b.project_id = v_pid;\r\n\r\n        END LOOP;\r\n    END IF;\r\n\r\n    RETURN NULL;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_post_claim",
    "function_code": "DECLARE\r\n  v_claim RECORD;\r\n  v_jv_id UUID;\r\n  v_total_deductions NUMERIC;\r\nBEGIN\r\n  SELECT * INTO v_claim FROM sub_claims WHERE id = p_id;\r\n  IF v_claim.is_posted THEN RETURN; END IF;\r\n\r\n  -- 1. إنشاء رأس القيد (وربطه بالمستخلص)\r\n  INSERT INTO journal_headers (entry_date, description, status, v_type, reference_id)\r\n  VALUES (v_claim.date, 'إثبات مستخلص مقاول باطن رقم: ' || v_claim.claim_number, 'posted', 'invoices', p_id)\r\n  RETURNING id INTO v_jv_id;\r\n\r\n  -- 2. المدين (حساب التكاليف 513)\r\n  -- 🚫 تم وضع NULL لمنع ظهوره في كشف الحساب\r\n  INSERT INTO journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n  VALUES (v_jv_id, 'da2d6fcd-ef45-41f4-a8d1-a498b6954002', NULL, v_claim.project_id, v_claim.total_amount, 0, 'قيمة أعمال منفذة مستخلص ' || v_claim.claim_number);\r\n\r\n  -- 3. الدائن (التزام المقاول 212)\r\n  -- ✅ هنا فقط يتم رمي آيدي المقاول ليظهر كاستحقاق في كشف حسابه (الصافي)\r\n  INSERT INTO journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n  VALUES (v_jv_id, '27f37adf-c0ec-4b40-80d0-2b36b853fd4b', v_claim.contractor_id, v_claim.project_id, 0, v_claim.net_amount, 'الصافي المستحق للصرف بموجب مستخلص ' || v_claim.claim_number);\r\n\r\n  -- 4. محتجز الضمان\r\n  -- 🚫 تم وضع NULL لمنع التداخل مع حساب المقاول الجاري\r\n  IF v_claim.retention_amount > 0 THEN\r\n    INSERT INTO journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n    VALUES (v_jv_id, '1e370e5b-4357-41a4-9271-7c98f9864205', NULL, v_claim.project_id, 0, v_claim.retention_amount, 'حجز ضمان أعمال مستخلص ' || v_claim.claim_number);\r\n  END IF;\r\n\r\n  -- 5. تسوية الاستقطاعات\r\n  -- 🚫 تم وضع NULL لمنع تضخم كشف الحساب بالخصومات\r\n  v_total_deductions := v_claim.total_amount - v_claim.net_amount - v_claim.retention_amount;\r\n  IF v_total_deductions > 0 THEN\r\n    INSERT INTO journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n    VALUES (v_jv_id, '27f37adf-c0ec-4b40-80d0-2b36b853fd4b', NULL, v_claim.project_id, 0, v_total_deductions, 'تسوية استقطاعات (دفعات مقدمة / خامات)');\r\n  END IF;\r\n\r\n  -- 6. تحديث حالة المستخلص\r\n  UPDATE sub_claims \r\n  SET is_posted = true, status = 'مُعتمد ومُرحل', jv_id = v_jv_id \r\n  WHERE id = p_id;\r\nEND;"
  },
  {
    "function_name": "rpc_get_inventory_balances",
    "function_code": "\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        v.item_id::uuid, \r\n        v.item_name::text,\r\n        COALESCE(v.available_quantity, 0)::numeric,\r\n        COALESCE(v.last_price, 0)::numeric,\r\n        v.unit::text\r\n    FROM public.vw_inventory_balances_v2 v;\r\nEND;\r\n"
  },
  {
    "function_name": "get_payroll_balances_with_cutoff",
    "function_code": "\r\nDECLARE\r\n    v_start_date date;\r\n    v_target_month text;\r\nBEGIN\r\n    v_start_date := MAKE_DATE(p_year, p_month, 1);\r\n    v_target_month := p_year::text || '-' || LPAD(p_month::text, 2, '0');\r\n\r\n    RETURN QUERY\r\n    SELECT p.id as partner_id,\r\n        CASE \r\n            WHEN p.partner_type = 'عامل يومية' THEN\r\n                -- 🚀 تم إزالة الضرب: نجمع الفلوس المسجلة في daily_wage مباشرة\r\n                COALESCE((SELECT SUM(ldl.daily_wage) FROM public.labor_daily_logs ldl WHERE ldl.worker_partner_id = p.id AND ldl.work_date < v_start_date), 0)\r\n                - COALESCE((SELECT SUM(pv.amount) FROM public.payment_vouchers pv WHERE pv.partner_id = p.id AND pv.date < v_start_date), 0)\r\n                - COALESCE((SELECT SUM(v.amount) FROM public.violations v WHERE v.partner_id = p.id AND v.date < v_start_date), 0)\r\n            ELSE\r\n                COALESCE((SELECT SUM(ps.net_salary) FROM public.payroll_slips ps WHERE ps.emp_id = p.id AND ps.is_posted = false AND ps.month < v_target_month), 0)\r\n        END::numeric as previous_unpaid_balance\r\n    FROM public.partners p\r\n    WHERE p.partner_type IN ('موظف', 'عامل', 'عامل يومية');\r\nEND;\r\n"
  },
  {
    "function_name": "pull_payroll_module_data",
    "function_code": "\r\nDECLARE\r\n    v_start_date date;\r\nBEGIN\r\n    v_start_date := MAKE_DATE(p_year, p_month, 1);\r\n\r\n    RETURN QUERY\r\n    SELECT \r\n        p.id as partner_id,\r\n        \r\n        -- أ. إجمالي أيام العمل (للعرض فقط في الجدول)\r\n        COALESCE((\r\n            SELECT SUM(ldl.attendance_value) FROM public.labor_daily_logs ldl\r\n            WHERE ldl.worker_partner_id = p.id\r\n              AND EXTRACT(MONTH FROM ldl.work_date) = p_month\r\n              AND EXTRACT(YEAR FROM ldl.work_date) = p_year\r\n        ), 0)::numeric as days_worked,\r\n\r\n        -- ب. 🚀 إجمالي الاستحقاق المالي (جمع الفلوس الجاهزة بدون ضرب)\r\n        COALESCE((\r\n            SELECT SUM(ldl.daily_wage) FROM public.labor_daily_logs ldl\r\n            WHERE ldl.worker_partner_id = p.id\r\n              AND EXTRACT(MONTH FROM ldl.work_date) = p_month\r\n              AND EXTRACT(YEAR FROM ldl.work_date) = p_year\r\n        ), 0)::numeric as total_earned_wage,\r\n\r\n        -- ج. الغرامات\r\n        COALESCE((\r\n            SELECT SUM(v.amount) FROM public.violations v\r\n            WHERE v.partner_id = p.id\r\n              AND v.date >= v_start_date AND v.date <= p_cutoff_date\r\n        ), 0)::numeric as total_violations,\r\n\r\n        -- د. دفعات سندات الصرف\r\n        COALESCE((\r\n            SELECT SUM(pv.amount) FROM public.payment_vouchers pv\r\n            WHERE pv.partner_id = p.id\r\n              AND pv.date >= v_start_date AND pv.date <= p_cutoff_date\r\n        ), 0)::numeric as total_payments\r\n\r\n    FROM public.partners p\r\n    WHERE p.partner_type IN ('موظف', 'عامل', 'عامل يومية');\r\nEND;\r\n"
  },
  {
    "function_name": "unpost_labor_daily_log",
    "function_code": "\r\nBEGIN\r\n    -- أ. مسح سطور القيد من الجورنال أولاً\r\n    DELETE FROM public.journal_lines \r\n    WHERE header_id IN (\r\n        SELECT id FROM public.journal_headers WHERE reference_id = p_log_id AND v_type = 'labor_daily_logs'\r\n    );\r\n\r\n    -- ب. مسح رأس القيد من الجورنال بالكامل\r\n    DELETE FROM public.journal_headers \r\n    WHERE reference_id = p_log_id AND v_type = 'labor_daily_logs';\r\n\r\n    -- ج. تعليق اليومية في جدول العمالة لتصبح مسودة\r\n    UPDATE public.labor_daily_logs\r\n    SET is_posted = false\r\n    WHERE id = p_log_id;\r\n\r\n    -- تنشيط كاش الواجهة الأمامية\r\n    PERFORM pg_notify('pgrst', 'reload schema');\r\n    RETURN TRUE;\r\nEND;\r\n"
  },
  {
    "function_name": "post_labor_logs_bulk",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\n    v_header_id uuid;\r\n    v_full_description TEXT;\r\n    v_daily_wage NUMERIC;\r\n    v_debit_acc uuid;\r\n    v_credit_acc uuid;\r\nBEGIN\r\n    FOR v_rec IN \r\n        SELECT * FROM public.labor_daily_logs \r\n        WHERE id = ANY(p_ids) AND (is_posted = false OR is_posted IS NULL) \r\n    LOOP\r\n        v_daily_wage := COALESCE(v_rec.daily_wage, 0);\r\n        \r\n        v_debit_acc := COALESCE(v_rec.debit_account_id, '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'::uuid);\r\n        v_credit_acc := COALESCE(v_rec.credit_account_id, '39f878cd-dc58-4a2a-a199-50f6fca983d4'::uuid);\r\n\r\n        IF v_daily_wage > 0 THEN\r\n            \r\n            -- 🌟 بناء البيان المدمج (مع تحويل أي أرقام لنصوص لتجنب خطأ btrim)\r\n            v_full_description := 'يومية عامل: ' || v_rec.worker_name;\r\n            \r\n            IF v_rec.site_ref IS NOT NULL AND TRIM(v_rec.site_ref::text) <> '' THEN\r\n                v_full_description := v_full_description || ' - موقع: ' || v_rec.site_ref::text;\r\n            END IF;\r\n            \r\n            IF v_rec.work_item IS NOT NULL AND TRIM(v_rec.work_item::text) <> '' THEN\r\n                v_full_description := v_full_description || ' - بند: ' || v_rec.work_item::text;\r\n            END IF;\r\n\r\n            IF v_rec.tareeha IS NOT NULL AND TRIM(v_rec.tareeha::text) <> '' THEN\r\n                v_full_description := v_full_description || ' - طريحة: ' || v_rec.tareeha::text;\r\n            END IF;\r\n\r\n            IF v_rec.productivity IS NOT NULL AND TRIM(v_rec.productivity::text) <> '' THEN\r\n                v_full_description := v_full_description || ' - إنتاجية: ' || v_rec.productivity::text;\r\n            END IF;\r\n\r\n            IF v_rec.attendance_value IS NOT NULL THEN\r\n                v_full_description := v_full_description || ' - حضور: ' || v_rec.attendance_value::text;\r\n            END IF;\r\n\r\n            -- 🚀 صمام الأمان: مسح القيود القديمة (لو فيه مسودة) عشان ميعملش دبلة\r\n            DELETE FROM public.journal_lines WHERE header_id IN (SELECT id FROM public.journal_headers WHERE reference_id = v_rec.id AND v_type = 'labor_daily_logs');\r\n            DELETE FROM public.journal_headers WHERE reference_id = v_rec.id AND v_type = 'labor_daily_logs';\r\n\r\n            -- 1. إنشاء رأس القيد الجديد\r\n            INSERT INTO public.journal_headers (reference_id, entry_date, description, v_type, status) \r\n            VALUES (v_rec.id, v_rec.work_date, v_full_description, 'labor_daily_logs', 'posted') \r\n            RETURNING id INTO v_header_id;\r\n\r\n            -- 2. إثبات التكلفة (مدين)\r\n            INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id, project_id, notes) \r\n            VALUES (v_header_id, v_debit_acc, v_daily_wage, 0, NULL, v_rec.project_id, v_full_description);\r\n\r\n            -- 3. إثبات الذمة (دائن)\r\n            INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id, project_id, notes) \r\n            VALUES (v_header_id, v_credit_acc, 0, v_daily_wage, v_rec.worker_partner_id, v_rec.project_id, v_full_description);\r\n            \r\n        END IF;\r\n\r\n        -- تحديث حالة اليومية لتصبح مرحلة\r\n        UPDATE public.labor_daily_logs SET is_posted = true WHERE id = v_rec.id;\r\n        \r\n    END LOOP;\r\n    \r\n    -- تنشيط الكاش عشان الواجهة تحس بالتغيير وتختفي الـ 404\r\n    PERFORM pg_notify('pgrst', 'reload schema');\r\nEND;\r\n"
  },
  {
    "function_name": "auto_create_contractor_assignment",
    "function_code": "\r\nBEGIN\r\n    -- إذا كان التنفيذ مقاول باطن\r\n    IF NEW.executor_type = 'مقاول باطن' AND NEW.contractor_id IS NOT NULL THEN\r\n        -- محاولة تحديث الإسناد إذا كان موجوداً مسبقاً (في حالة تعديل أمر الشغل)\r\n        UPDATE public.contractor_assignments\r\n        SET \r\n            contractor_id = NEW.contractor_id,\r\n            project_id = NEW.project_id,\r\n            boq_budget_id = NEW.boq_budget_id,\r\n            assigned_qty = NEW.assigned_qty,\r\n            unit_price = NEW.unit_price\r\n        WHERE job_order_id = NEW.id;\r\n\r\n        -- إذا لم يتم تحديث أي سجل (يعني السجل مش موجود)، قم بإنشائه (INSERT)\r\n        IF NOT FOUND THEN\r\n            INSERT INTO public.contractor_assignments (\r\n                job_order_id, contractor_id, project_id, boq_budget_id, \r\n                assigned_qty, unit_price, status\r\n            ) VALUES (\r\n                NEW.id, NEW.contractor_id, NEW.project_id, NEW.boq_budget_id, \r\n                NEW.assigned_qty, NEW.unit_price, 'جاري التنفيذ'\r\n            );\r\n        END IF;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "auto_link_material_to_job_order",
    "function_code": "\r\nDECLARE\r\n    v_project_id UUID;\r\n    v_contractor_id UUID;\r\nBEGIN\r\n    -- إذا كانت الخامة ملهاش أمر شغل\r\n    IF NEW.job_order_id IS NULL THEN\r\n        -- نجيب بيانات الفيلا والمقاول من \"رأس إذن الصرف\"\r\n        SELECT project_id, subcontractor_id INTO v_project_id, v_contractor_id\r\n        FROM public.material_issues\r\n        WHERE id = NEW.issue_id;\r\n\r\n        -- لو متسجلة على مقاول وفيلا، ندور على أمر الشغل بتاعهم\r\n        IF v_project_id IS NOT NULL AND v_contractor_id IS NOT NULL THEN\r\n            SELECT id INTO NEW.job_order_id\r\n            FROM public.job_orders\r\n            WHERE project_id = v_project_id\r\n              AND contractor_id = v_contractor_id\r\n              AND status IN ('جاري التنفيذ', 'مسودة')\r\n            ORDER BY created_at DESC\r\n            LIMIT 1;\r\n\r\n            -- لو لقينا أمر شغل، نربط الخامة ونفعل خيار \"تخصم من المقاول\"\r\n            IF NEW.job_order_id IS NOT NULL THEN\r\n                NEW.is_deducted_from_contractor := true;\r\n            END IF;\r\n        END IF;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "post_violations_bulk",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\n    v_header_id uuid;\r\n    v_full_description TEXT;\r\n    \r\n    -- الحسابات الثابتة الافتراضية\r\n    v_fixed_debit_acc UUID := '39f878cd-dc58-4a2a-a199-50f6fca983d4';  -- رواتب وأجور مستحقة (المدين دائماً)\r\n    v_fixed_credit_acc UUID := '25998af5-dca4-4512-8f1a-3d0f9c6b8e98'; -- إيراد خصومات وجزاءات (الدائن الافتراضي)\r\n    \r\n    -- متغيرات للحسابات الديناميكية\r\n    v_housing_recovery_acc UUID;\r\n    v_actual_credit_acc UUID;\r\nBEGIN\r\n    -- 🔍 محاولة جلب الآي دي الخاص بحساب استرداد السكن من شجرة الحسابات تلقائياً\r\n    SELECT id INTO v_housing_recovery_acc \r\n    FROM public.accounts \r\n    WHERE name LIKE '%استرداد مصروفات السكن%' OR name LIKE '%استرداد سكن%'\r\n    LIMIT 1;\r\n\r\n    FOR v_rec IN \r\n        SELECT * FROM public.violations \r\n        WHERE id = ANY(p_ids) AND (is_posted = false OR is_posted IS NULL) \r\n    LOOP\r\n        IF COALESCE(v_rec.amount, 0) > 0 THEN\r\n            \r\n            -- بناء البيان\r\n            v_full_description := 'جزاء/استقطاع على: ' || COALESCE(v_rec.emp_name, 'موظف') || \r\n                                  ' - ' || COALESCE(v_rec.reason, 'خصم إداري');\r\n\r\n            -- 🎯 توجيه الطرف الدائن (حساب الشركة) بذكاء\r\n            IF v_rec.reason LIKE '%سكن%' AND v_housing_recovery_acc IS NOT NULL THEN\r\n                v_actual_credit_acc := v_housing_recovery_acc;\r\n            ELSE\r\n                v_actual_credit_acc := v_fixed_credit_acc;\r\n            END IF;\r\n\r\n            -- 1. إنشاء رأس القيد\r\n            INSERT INTO public.journal_headers (reference_id, entry_date, description, v_type, status) \r\n            VALUES (v_rec.id, v_rec.date, v_full_description, 'violations', 'posted') \r\n            RETURNING id INTO v_header_id;\r\n\r\n            -- 2. الجانب المدين (رواتب وأجور مستحقة - ذمة الموظف) \r\n            -- 🟢 هنا بنرمي آي دي البارتنر عشان يسمع في كشف حسابه\r\n            INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id, project_id, notes) \r\n            VALUES (v_header_id, v_fixed_debit_acc, v_rec.amount, 0, v_rec.partner_id, v_rec.project_id, v_full_description);\r\n\r\n            -- 3. الجانب الدائن (استرداد سكن أو إيراد جزاءات - ذمة الشركة)\r\n            -- 🔴 هنا خلينا الـ partner_id بـ NULL عشان ذمة الشركة تبقى فاضية\r\n            INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id, project_id, notes) \r\n            VALUES (v_header_id, v_actual_credit_acc, 0, v_rec.amount, NULL, v_rec.project_id, v_full_description);\r\n            \r\n            -- 4. تحديث حالة السجل إلى مرحل\r\n            UPDATE public.violations SET \r\n                is_posted = true,\r\n                debit_account_id = v_fixed_debit_acc,\r\n                credit_account_id = v_actual_credit_acc\r\n            WHERE id = v_rec.id;\r\n\r\n        END IF;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_post_material_issue",
    "function_code": "\r\nDECLARE\r\n  v_issue RECORD;\r\n  v_jv_id uuid;\r\n  v_safe_amount numeric(15,2);\r\n  v_inventory_acc uuid;\r\n  v_subcontractor_acc uuid;\r\n  v_expense_acc uuid;\r\nBEGIN\r\n  SELECT * INTO v_issue FROM public.material_issues WHERE id = p_id;\r\n  IF v_issue.is_posted THEN RAISE EXCEPTION 'مرحل بالفعل!'; END IF;\r\n\r\n  v_safe_amount := COALESCE(v_issue.total_amount, 0);\r\n\r\n  -- استدعاء الحسابات بناءً على الـ Code بدلاً من UUID الثابت\r\n  SELECT id INTO v_inventory_acc FROM public.accounts WHERE code = '126' LIMIT 1;\r\n  SELECT id INTO v_subcontractor_acc FROM public.accounts WHERE code = '212' LIMIT 1;\r\n  SELECT id INTO v_expense_acc FROM public.accounts WHERE code = '511' LIMIT 1;\r\n\r\n  IF v_inventory_acc IS NULL THEN RAISE EXCEPTION 'حساب مخزون الخامات (126) غير موجود في الدليل المحاسبي'; END IF;\r\n\r\n  INSERT INTO public.journal_headers (\r\n    entry_date, reference_id, description, status, v_type, created_at\r\n  ) VALUES (\r\n    v_issue.issue_date, v_issue.id,\r\n    'إثبات صرف خامات - إذن رقم: ' || COALESCE(v_issue.issue_number, 'بدون رقم'),\r\n    'posted', 'إذن صرف', now()\r\n  ) RETURNING id INTO v_jv_id;\r\n\r\n  INSERT INTO public.journal_lines (\r\n    header_id, account_id, project_id, partner_id, debit, credit, notes        \r\n  ) VALUES (\r\n    v_jv_id, v_inventory_acc, v_issue.project_id, NULL, \r\n    0, v_safe_amount, \r\n    'صرف خامات من المخزن - إذن: ' || COALESCE(v_issue.issue_number, 'بدون رقم')\r\n  );\r\n\r\n  IF v_issue.issue_type = 'صرف لمقاول' AND v_issue.subcontractor_id IS NOT NULL THEN\r\n      IF v_subcontractor_acc IS NULL THEN RAISE EXCEPTION 'حساب التزام مقاولي الباطن (212) غير موجود'; END IF;\r\n      INSERT INTO public.journal_lines (\r\n        header_id, account_id, project_id, partner_id, debit, credit, notes        \r\n      ) VALUES (\r\n        v_jv_id, v_subcontractor_acc, v_issue.project_id, v_issue.subcontractor_id, \r\n        v_safe_amount, 0, \r\n        'تحميل خامات عهدة على المقاول - إذن: ' || COALESCE(v_issue.issue_number, 'بدون رقم')\r\n      );\r\n  ELSE\r\n      IF v_expense_acc IS NULL THEN RAISE EXCEPTION 'حساب تكلفة مواد وخامات (511) غير موجود'; END IF;\r\n      INSERT INTO public.journal_lines (\r\n        header_id, account_id, project_id, partner_id, debit, credit, notes        \r\n      ) VALUES (\r\n        v_jv_id, v_expense_acc, v_issue.project_id, NULL, \r\n        v_safe_amount, 0, \r\n        'استهلاك خامات للمشروع - إذن: ' || COALESCE(v_issue.issue_number, 'بدون رقم')\r\n      );\r\n  END IF;\r\n\r\n  UPDATE public.material_issues SET is_posted = true, jv_id = v_jv_id WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "post_sub_claim",
    "function_code": "\r\nDECLARE\r\n    v_rec RECORD;\r\n    v_jv_id UUID;\r\n    v_contractor_earnings NUMERIC;\r\n    v_project_account UUID;\r\n    v_contractor_account UUID;\r\n    v_retention_account UUID;\r\nBEGIN\r\n    SELECT sc.*, p.name as contractor_name\r\n    FROM public.sub_claims sc\r\n    JOIN public.partners p ON sc.contractor_id = p.id\r\n    WHERE sc.id = p_id INTO v_rec;\r\n\r\n    IF v_rec.id IS NULL THEN RAISE EXCEPTION 'خطأ: المستخلص غير موجود في النظام!'; END IF;\r\n    IF v_rec.is_posted THEN RAISE EXCEPTION 'تنبيه: هذا المستخلص مرحل مسبقاً!'; END IF;\r\n\r\n    -- ديناميكياً بدلاً من UUID\r\n    SELECT id INTO v_project_account FROM public.accounts WHERE code = '513' LIMIT 1;\r\n    SELECT id INTO v_contractor_account FROM public.accounts WHERE code = '212' LIMIT 1;\r\n    SELECT id INTO v_retention_account FROM public.accounts WHERE code = '213' LIMIT 1;\r\n\r\n    IF v_project_account IS NULL THEN RAISE EXCEPTION 'حساب تكاليف مقاولين (513) غير موجود'; END IF;\r\n    IF v_contractor_account IS NULL THEN RAISE EXCEPTION 'حساب مقاولي باطن (212) غير موجود'; END IF;\r\n\r\n    v_contractor_earnings := COALESCE(v_rec.total_amount, 0) - COALESCE(v_rec.retention_amount, 0);\r\n\r\n    INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)\r\n    VALUES (\r\n        v_rec.date, \r\n        'مستخلص أعمال رقم: ' || COALESCE(v_rec.claim_number, '') || ' - المقاول: ' || v_rec.contractor_name, \r\n        'posted', 'مستخلص', v_rec.id\r\n    ) RETURNING id INTO v_jv_id;\r\n\r\n    IF COALESCE(v_rec.total_amount, 0) > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_project_account, NULL, v_rec.project_id, v_rec.total_amount, 0, 'إجمالي تكلفة أعمال منفذة - مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    IF COALESCE(v_rec.retention_amount, 0) > 0 THEN\r\n        IF v_retention_account IS NULL THEN RAISE EXCEPTION 'حساب تأمينات محتجزة (213) غير موجود'; END IF;\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_retention_account, NULL, v_rec.project_id, 0, v_rec.retention_amount, 'حجز ضمان أعمال - مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    IF v_contractor_earnings > 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_contractor_account, v_rec.contractor_id, v_rec.project_id, 0, v_contractor_earnings, 'استحقاق أعمال - مستخلص ' || v_rec.claim_number);\r\n    ELSIF v_contractor_earnings < 0 THEN\r\n        INSERT INTO public.journal_lines (header_id, account_id, partner_id, project_id, debit, credit, notes)\r\n        VALUES (v_jv_id, v_contractor_account, v_rec.contractor_id, v_rec.project_id, ABS(v_contractor_earnings), 0, 'تسوية عكسية لأعمال سالبة - مستخلص ' || v_rec.claim_number);\r\n    END IF;\r\n\r\n    UPDATE public.sub_claims \r\n    SET is_posted = true, status = 'مُعتمد ومُرحل', jv_header_id = v_jv_id, jv_id = v_jv_id\r\n    WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "rpc_post_material_receipt",
    "function_code": "\r\nDECLARE\r\n  v_receipt RECORD;\r\n  v_jv_id uuid;\r\n  v_inventory_acc uuid;\r\n  v_client_inventory_acc uuid;\r\nBEGIN\r\n  SELECT * INTO v_receipt FROM public.material_receipts WHERE id = p_id;\r\n  IF v_receipt.is_posted THEN RAISE EXCEPTION 'هذا السند مرحل محاسبياً بالفعل!'; END IF;\r\n\r\n  SELECT id INTO v_inventory_acc FROM public.accounts WHERE code = '126' LIMIT 1;\r\n  SELECT id INTO v_client_inventory_acc FROM public.accounts WHERE code = '211' LIMIT 1;\r\n\r\n  IF v_inventory_acc IS NULL THEN RAISE EXCEPTION 'حساب المخزون (126) غير موجود'; END IF;\r\n  IF v_client_inventory_acc IS NULL THEN RAISE EXCEPTION 'حساب الموردين (211) غير موجود'; END IF;\r\n\r\n  INSERT INTO public.journal_headers (\r\n    entry_date, reference_id, description, status, v_type, created_at\r\n  ) VALUES (\r\n    v_receipt.receipt_date, v_receipt.id,\r\n    'إثبات توريد خامات - سند رقم: ' || v_receipt.receipt_number,\r\n    'posted', 'inventory', now()\r\n  ) RETURNING id INTO v_jv_id;\r\n\r\n  INSERT INTO public.journal_lines (\r\n    header_id, account_id, project_id, partner_id, debit, credit, notes         \r\n  ) VALUES (\r\n    v_jv_id, v_inventory_acc, v_receipt.project_id, NULL, \r\n    v_receipt.total_amount, 0, 'دخول خامات للمخزن - سند: ' || v_receipt.receipt_number\r\n  );\r\n\r\n  INSERT INTO public.journal_lines (\r\n    header_id, account_id, project_id, partner_id, debit, credit, notes         \r\n  ) VALUES (\r\n    v_jv_id, v_client_inventory_acc, v_receipt.project_id, v_receipt.supplier_id, \r\n    0, v_receipt.total_amount, 'استحقاق توريد خامات للمشروع - سند: ' || v_receipt.receipt_number\r\n  );\r\n\r\n  UPDATE public.material_receipts SET is_posted = true, jv_id = v_jv_id WHERE id = p_id;\r\nEND;\r\n"
  },
  {
    "function_name": "bulk_disburse_expenses",
    "function_code": "\r\nDECLARE\r\n    v_record RECORD;\r\n    v_voucher_no TEXT;\r\n    v_total NUMERIC;\r\n    v_lines_total NUMERIC;\r\n    v_debit_acc_id UUID;\r\n    v_main_treasury_id UUID;\r\n    v_counter INT := 1;\r\n    v_batch_id TEXT;\r\nBEGIN\r\n    SELECT id INTO v_main_treasury_id FROM public.accounts WHERE code = '122' LIMIT 1;\r\n    IF v_main_treasury_id IS NULL THEN RAISE EXCEPTION 'حساب الخزينة الرئيسية (122) غير موجود'; END IF;\r\n\r\n    v_batch_id := to_char(clock_timestamp(), 'YYMMDDHH24MISS');\r\n\r\n    FOR v_record IN SELECT * FROM expenses WHERE id = ANY(p_expense_ids) LOOP\r\n        SELECT SUM(COALESCE((line->>'total_price')::numeric, (line->>'quantity')::numeric * (line->>'unit_price')::numeric, 0))\r\n        INTO v_lines_total\r\n        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_record.lines_data) = 'array' THEN v_record.lines_data ELSE '[]'::jsonb END) AS line;\r\n\r\n        IF COALESCE(v_lines_total, 0) > 0 THEN\r\n            v_total := v_lines_total + COALESCE(v_record.vat_amount, 0) - COALESCE(v_record.discount_amount, 0);\r\n        ELSE\r\n            v_total := COALESCE(v_record.total_price, (v_record.quantity * v_record.unit_price)) + COALESCE(v_record.vat_amount, 0) - COALESCE(v_record.discount_amount, 0);\r\n        END IF;\r\n\r\n        IF COALESCE(v_record.paid_amount, 0) >= v_total THEN CONTINUE; END IF;\r\n\r\n        SELECT id INTO v_debit_acc_id FROM accounts WHERE (code || ' - ' || name) = v_record.payment_account OR name = v_record.payment_account LIMIT 1;\r\n        v_voucher_no := 'PV-' || v_batch_id || '-' || v_counter::text;\r\n\r\n        INSERT INTO payment_vouchers (\r\n            voucher_number, date, amount, partner_id, debit_account_id, credit_account_id,\r\n            description, status, related_expense_id, payment_method, site_ref, created_by\r\n        ) VALUES (\r\n            v_voucher_no, CURRENT_DATE, (v_total - COALESCE(v_record.paid_amount, 0)),\r\n            v_record.payee_id, v_debit_acc_id, v_main_treasury_id,\r\n            'سداد مصروف: ' || COALESCE(v_record.description, '') || ' (صرف جماعي)',\r\n            'مسودة', v_record.id, 'نقدي', v_record.site_ref, p_user_id\r\n        );\r\n\r\n        UPDATE expenses SET paid_amount = v_total WHERE id = v_record.id;\r\n        v_counter := v_counter + 1;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "set_site_ref_auto",
    "function_code": "\r\nBEGIN\r\n    -- إذا تم إدخال أو تعديل معرف المشروع وقيمته ليست فارغة\r\n    IF NEW.project_id IS NOT NULL THEN\r\n        SELECT \"Property\" INTO NEW.site_ref \r\n        FROM public.projects \r\n        WHERE id = NEW.project_id;\r\n    ELSE\r\n        -- إذا تم مسح المشروع، نجعل خانة الموقع فارغة أيضاً\r\n        NEW.site_ref := NULL;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n"
  },
  {
    "function_name": "post_violations_bulk_journal",
    "function_code": "\r\nDECLARE\r\n    v_id uuid;\r\n    v_rec record;\r\n    v_header_id uuid;\r\n    v_housing_recovery_acc UUID;\r\n    v_actual_credit_acc UUID;\r\n    v_full_description TEXT; \r\nBEGIN\r\n    -- جلب حساب استرداد السكن تلقائياً\r\n    SELECT id INTO v_housing_recovery_acc \r\n    FROM public.accounts \r\n    WHERE name LIKE '%استرداد مصروفات السكن%' OR name LIKE '%استرداد سكن%'\r\n    LIMIT 1;\r\n\r\n    FOREACH v_id IN ARRAY violation_ids\r\n    LOOP\r\n        SELECT * INTO v_rec FROM public.violations WHERE id = v_id AND is_posted = false;\r\n\r\n        IF FOUND THEN\r\n            -- توجيه الطرف الدائن\r\n            IF v_rec.reason LIKE '%سكن%' AND v_housing_recovery_acc IS NOT NULL THEN\r\n                v_actual_credit_acc := v_housing_recovery_acc;\r\n            ELSE\r\n                v_actual_credit_acc := v_rec.credit_account_id;\r\n            END IF;\r\n\r\n            -- بناء البيان التفصيلي\r\n            v_full_description := 'استقطاع/جزاء: ' || COALESCE(v_rec.emp_name, 'موظف') || \r\n                                  ' - ' || COALESCE(v_rec.reason, 'بدون تفاصيل');\r\n\r\n            -- 1. إنشاء رأس القيد (تم تصحيح الحالة هنا لتكون posted)\r\n            INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status)\r\n            VALUES (\r\n                v_rec.date,\r\n                v_full_description, \r\n                v_rec.id,\r\n                'مخالفة',\r\n                'posted' -- 🚀 تم التصحيح هنا لكي يقرأها ميزان المراجعة!\r\n            ) RETURNING id INTO v_header_id;\r\n\r\n            -- 2. إنشاء سطر المدين\r\n            IF v_rec.debit_account_id IS NOT NULL THEN\r\n                INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes, partner_id, project_id)\r\n                VALUES (v_header_id, v_rec.debit_account_id, COALESCE(v_rec.amount, 0), 0, v_full_description, v_rec.partner_id, v_rec.project_id);\r\n            END IF;\r\n\r\n            -- 3. إنشاء سطر الدائن\r\n            IF v_actual_credit_acc IS NOT NULL THEN\r\n                INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes, partner_id, project_id)\r\n                VALUES (v_header_id, v_actual_credit_acc, 0, COALESCE(v_rec.amount, 0), v_full_description, NULL, v_rec.project_id);\r\n            END IF;\r\n\r\n            -- 4. التحديث كـ مرحل\r\n            UPDATE public.violations SET \r\n                is_posted = true,\r\n                credit_account_id = v_actual_credit_acc \r\n            WHERE id = v_id;\r\n        END IF;\r\n    END LOOP;\r\nEND;\r\n"
  },
  {
    "function_name": "sync_invoice_payments",
    "function_code": "\r\nDECLARE\r\n    v_invoice_id UUID;\r\n    v_total_paid NUMERIC(15,2);\r\nBEGIN\r\n    -- 1. تحديد الفاتورة المستهدفة (في حالة الإضافة أو التعديل أو الحذف)\r\n    IF TG_OP = 'DELETE' THEN\r\n        v_invoice_id := OLD.invoice_id;\r\n    ELSE\r\n        v_invoice_id := NEW.invoice_id;\r\n    END IF;\r\n\r\n    -- 2. إذا كان السند مربوط بفاتورة فعلاً\r\n    IF v_invoice_id IS NOT NULL THEN\r\n        -- حساب إجمالي المبالغ المقبوضة فعلياً لهذه الفاتورة \r\n        -- 🚀 تم التعديل: إضافة حالة 'مُعتمد' بالتشكيل عشان السيستم يلقطها\r\n        SELECT COALESCE(SUM(amount), 0) INTO v_total_paid\r\n        FROM public.receipt_vouchers\r\n        WHERE invoice_id = v_invoice_id \r\n          AND status IN ('مرحل', 'معتمد', 'مُعتمد'); \r\n\r\n        -- 3. تحديث الفاتورة بالمدفوع فقط! (بدون التدخل في حالة الترحيل نهائياً)\r\n        UPDATE public.invoices\r\n        SET paid_amount = v_total_paid\r\n        WHERE id = v_invoice_id;\r\n    END IF;\r\n\r\n    -- معالجة حالة نادرة: لو المستخدم عدل السند ونقله من فاتورة لفاتورة تانية\r\n    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS NOT NULL AND OLD.invoice_id <> NEW.invoice_id THEN\r\n        SELECT COALESCE(SUM(amount), 0) INTO v_total_paid \r\n        FROM public.receipt_vouchers \r\n        WHERE invoice_id = OLD.invoice_id AND status IN ('مرحل', 'معتمد', 'مُعتمد');\r\n        \r\n        UPDATE public.invoices \r\n        SET paid_amount = v_total_paid \r\n        WHERE id = OLD.invoice_id;\r\n    END IF;\r\n\r\n    RETURN NULL;\r\nEND;\r\n"
  }
]
[
  {
    "table_name": "expenses",
    "trigger_name": "trigger_update_boq_direct_expenses",
    "action_statement": "EXECUTE FUNCTION update_boq_direct_expenses_live()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trigger_update_boq_direct_expenses",
    "action_statement": "EXECUTE FUNCTION update_boq_direct_expenses_live()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trigger_update_boq_direct_expenses",
    "action_statement": "EXECUTE FUNCTION update_boq_direct_expenses_live()"
  },
  {
    "table_name": "boq_budget",
    "trigger_name": "trigger_maintain_boq_property_name",
    "action_statement": "EXECUTE FUNCTION maintain_boq_property_name()"
  },
  {
    "table_name": "boq_budget",
    "trigger_name": "trigger_maintain_boq_property_name",
    "action_statement": "EXECUTE FUNCTION maintain_boq_property_name()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_sync_invoice_payments",
    "action_statement": "EXECUTE FUNCTION sync_invoice_payments()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_sync_invoice_payments",
    "action_statement": "EXECUTE FUNCTION sync_invoice_payments()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_sync_invoice_payments",
    "action_statement": "EXECUTE FUNCTION sync_invoice_payments()"
  },
  {
    "table_name": "job_orders",
    "trigger_name": "trg_job_order_to_assignment",
    "action_statement": "EXECUTE FUNCTION auto_create_contractor_assignment()"
  },
  {
    "table_name": "job_orders",
    "trigger_name": "trg_job_order_to_assignment",
    "action_statement": "EXECUTE FUNCTION auto_create_contractor_assignment()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_labor_cost",
    "action_statement": "EXECUTE FUNCTION update_boq_labor_cost_live()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_labor_cost",
    "action_statement": "EXECUTE FUNCTION update_boq_labor_cost_live()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_labor_cost",
    "action_statement": "EXECUTE FUNCTION update_boq_labor_cost_live()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_quantity",
    "action_statement": "EXECUTE FUNCTION update_boq_actual_quantity()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_quantity",
    "action_statement": "EXECUTE FUNCTION update_boq_actual_quantity()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trigger_update_boq_quantity",
    "action_statement": "EXECUTE FUNCTION update_boq_actual_quantity()"
  },
  {
    "table_name": "boq_budget",
    "trigger_name": "trigger_sync_boq_on_save",
    "action_statement": "EXECUTE FUNCTION sync_boq_from_logs_on_save()"
  },
  {
    "table_name": "boq_budget",
    "trigger_name": "trigger_sync_boq_on_save",
    "action_statement": "EXECUTE FUNCTION sync_boq_from_logs_on_save()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trigger_maintain_material_issue_boq_id",
    "action_statement": "EXECUTE FUNCTION maintain_material_issue_boq_id()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trigger_maintain_material_issue_boq_id",
    "action_statement": "EXECUTE FUNCTION maintain_material_issue_boq_id()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trigger_update_boq_material_cost_live",
    "action_statement": "EXECUTE FUNCTION update_boq_material_cost_live()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trigger_update_boq_material_cost_live",
    "action_statement": "EXECUTE FUNCTION update_boq_material_cost_live()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trigger_update_boq_material_cost_live",
    "action_statement": "EXECUTE FUNCTION update_boq_material_cost_live()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_receipt_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_receipt_voucher_cash_flow()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_receipt_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_receipt_voucher_cash_flow()"
  },
  {
    "table_name": "receipt_vouchers",
    "trigger_name": "trg_receipt_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_receipt_voucher_cash_flow()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_payment_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_payment_voucher_cash_flow()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_payment_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_payment_voucher_cash_flow()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_payment_cash_flow",
    "action_statement": "EXECUTE FUNCTION handle_payment_voucher_cash_flow()"
  },
  {
    "table_name": "temp_labor_daily_logs",
    "trigger_name": "trg_fix_temp_import_id",
    "action_statement": "EXECUTE FUNCTION fix_temp_import_id()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trigger_auto_bind_payee_id",
    "action_statement": "EXECUTE FUNCTION auto_bind_payee_id_from_subcontractor()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trigger_auto_bind_payee_id",
    "action_statement": "EXECUTE FUNCTION auto_bind_payee_id_from_subcontractor()"
  },
  {
    "table_name": "violations",
    "trigger_name": "trigger_auto_fill_violation_names",
    "action_statement": "EXECUTE FUNCTION auto_fill_violation_names()"
  },
  {
    "table_name": "violations",
    "trigger_name": "trigger_auto_fill_violation_names",
    "action_statement": "EXECUTE FUNCTION auto_fill_violation_names()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_update_expense_status",
    "action_statement": "EXECUTE FUNCTION handle_expense_status_on_payment()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_update_expense_status",
    "action_statement": "EXECUTE FUNCTION handle_expense_status_on_payment()"
  },
  {
    "table_name": "payment_vouchers",
    "trigger_name": "trg_update_expense_status",
    "action_statement": "EXECUTE FUNCTION handle_expense_status_on_payment()"
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_invoice_revenue_recalc",
    "action_statement": "EXECUTE FUNCTION update_boq_revenue_from_invoice_live()"
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_invoice_revenue_recalc",
    "action_statement": "EXECUTE FUNCTION update_boq_revenue_from_invoice_live()"
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_invoice_revenue_recalc",
    "action_statement": "EXECUTE FUNCTION update_boq_revenue_from_invoice_live()"
  },
  {
    "table_name": "contractor_assignments",
    "trigger_name": "trg_auto_villa_name",
    "action_statement": "EXECUTE FUNCTION set_villa_name_auto()"
  },
  {
    "table_name": "contractor_assignments",
    "trigger_name": "trg_auto_villa_name",
    "action_statement": "EXECUTE FUNCTION set_villa_name_auto()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trg_auto_site_ref",
    "action_statement": "EXECUTE FUNCTION set_site_ref_auto()"
  },
  {
    "table_name": "labor_daily_logs",
    "trigger_name": "trg_auto_site_ref",
    "action_statement": "EXECUTE FUNCTION set_site_ref_auto()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trg_auto_link_expense",
    "action_statement": "EXECUTE FUNCTION auto_link_expense_to_job_order()"
  },
  {
    "table_name": "expenses",
    "trigger_name": "trg_auto_link_expense",
    "action_statement": "EXECUTE FUNCTION auto_link_expense_to_job_order()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trg_auto_link_material",
    "action_statement": "EXECUTE FUNCTION auto_link_material_to_job_order()"
  },
  {
    "table_name": "material_issue_lines",
    "trigger_name": "trg_auto_link_material",
    "action_statement": "EXECUTE FUNCTION auto_link_material_to_job_order()"
  }
]
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  role text DEFAULT 'staff'::text CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'manager'::text, 'staff'::text, 'contractor'::text, 'client'::text])),
  permissions jsonb DEFAULT '{}'::jsonb,
  signature_url text,
  linked_partner_id uuid,
  avatar_url text,
  nickname text,
  phone_number text,
  full_name text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_partner_id_fkey FOREIGN KEY (linked_partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  account_type character varying NOT NULL,
  parent_id uuid,
  is_transactional boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.journal_headers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  description character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'draft'::character varying,
  reference_id uuid,
  v_type text,
  CONSTRAINT journal_headers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  header_id uuid NOT NULL,
  account_id uuid NOT NULL,
  partner_id uuid,
  item_name character varying,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  notes text,
  project_id uuid,
  debit_account_id uuid DEFAULT '23623b40-72f8-460b-92f6-984457003a34'::uuid,
  tax_amount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journal_lines_pkey PRIMARY KEY (id),
  CONSTRAINT journal_lines_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.journal_headers(id),
  CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT journal_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT journal_lines_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT journal_lines_debit_account_id_fkey FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_code character varying UNIQUE,
  Property character varying NOT NULL UNIQUE,
  client_name character varying,
  contract_value numeric DEFAULT 0,
  estimated_budget numeric DEFAULT 0,
  down_payment numeric DEFAULT 0,
  start_date date,
  end_date date,
  actual_completion_date date,
  location_address text,
  location_url text,
  project_manager text,
  status character varying DEFAULT 'قيد الدراسة'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  project_name text,
  client_id uuid,
  current_stage character varying DEFAULT 'تجهيز الموقع'::character varying,
  unit_type character varying,
  unit_area numeric DEFAULT 0,
  engineer_in_charge character varying,
  engineer_phone character varying,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.partners(id)
);
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  partner_type character varying NOT NULL,
  identity_number character varying,
  identity_expiry_date date,
  identity_image_url text,
  phone character varying,
  address text,
  vat_number character varying,
  created_at timestamp with time zone DEFAULT now(),
  job_role character varying,
  account_id uuid,
  is_active boolean DEFAULT true,
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.labor_daily_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_date date NOT NULL,
  worker_name text NOT NULL,
  site_ref text,
  work_item text,
  unit text,
  skill_level text,
  daily_wage numeric DEFAULT 0,
  attendance_value numeric DEFAULT 0,
  sub_contractor text,
  notes text,
  project_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  worker_partner_id uuid,
  sub_contractor_id uuid,
  is_posted boolean DEFAULT false,
  work_item_id uuid,
  tareeha numeric,
  productivity numeric,
  completion_percentage numeric,
  credit_account_id uuid DEFAULT '39f878cd-dc58-4a2a-a199-50f6fca983d4'::uuid,
  debit_account_id uuid DEFAULT '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c'::uuid,
  production_desc text,
  completed_quantity numeric DEFAULT 0,
  number_of_workers integer DEFAULT 1,
  job_order_id uuid,
  CONSTRAINT labor_daily_logs_pkey PRIMARY KEY (id),
  CONSTRAINT labor_daily_logs_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.boq_items(id),
  CONSTRAINT labor_daily_logs_debit_account_id_fkey FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT labor_daily_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT labor_daily_logs_worker_partner_id_fkey FOREIGN KEY (worker_partner_id) REFERENCES public.partners(id),
  CONSTRAINT labor_daily_logs_sub_contractor_id_fkey FOREIGN KEY (sub_contractor_id) REFERENCES public.partners(id),
  CONSTRAINT labor_daily_logs_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.job_orders(id)
);
CREATE TABLE public.boq_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_code character varying NOT NULL UNIQUE,
  main_category character varying NOT NULL,
  sub_category character varying NOT NULL,
  item_name text NOT NULL,
  unit_of_measure character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tareeha numeric DEFAULT 0.00,
  CONSTRAINT boq_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number character varying NOT NULL UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  partner_id uuid,
  client_name character varying,
  project_ids ARRAY,
  description text,
  materials_discount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  guarantee_percent numeric DEFAULT 0,
  guarantee_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  debit_account_id uuid DEFAULT '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid,
  credit_account_id uuid DEFAULT '6667f91a-9478-49ab-9721-521ee09381fa'::uuid,
  materials_acc_id uuid DEFAULT '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid,
  guarantee_acc_id uuid DEFAULT '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid,
  tax_acc_id uuid DEFAULT '6667f91a-9478-49ab-9721-521ee09381fa'::uuid,
  skip_zatca boolean DEFAULT false,
  status character varying DEFAULT 'معلق'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  due_in_days integer DEFAULT 0,
  due_date date,
  paid_amount numeric DEFAULT 0,
  lines_data jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT invoices_debit_acc_fkey FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT invoices_credit_acc_fkey FOREIGN KEY (credit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT invoices_materials_acc_fkey FOREIGN KEY (materials_acc_id) REFERENCES public.accounts(id),
  CONSTRAINT invoices_guarantee_acc_fkey FOREIGN KEY (guarantee_acc_id) REFERENCES public.accounts(id),
  CONSTRAINT invoices_tax_acc_fkey FOREIGN KEY (tax_acc_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.receipt_vouchers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['نقدي (كاش)'::text, 'تحويل بنكي'::text, 'شيك'::text])),
  notes text,
  partner_id uuid,
  invoice_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  receipt_number character varying UNIQUE,
  status character varying DEFAULT 'مسودة'::character varying,
  safe_bank_acc_id uuid,
  partner_acc_id uuid,
  project_ids ARRAY,
  reference_number text,
  attachment_url text,
  CONSTRAINT receipt_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT receipt_vouchers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT receipt_vouchers_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT receipt_vouchers_safe_bank_acc_id_fkey FOREIGN KEY (safe_bank_acc_id) REFERENCES public.accounts(id),
  CONSTRAINT receipt_vouchers_partner_acc_id_fkey FOREIGN KEY (partner_acc_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.payment_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_number text NOT NULL UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount > 0::numeric),
  partner_id uuid,
  credit_account_id uuid,
  payment_method text,
  reference_no text,
  description text,
  notes text,
  status text NOT NULL DEFAULT 'مسودة'::text,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  debit_account_id uuid,
  site_ref text,
  related_expense_id uuid,
  sub_claim_id uuid,
  project_ids ARRAY,
  CONSTRAINT payment_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT payment_vouchers_debit_account_id_fkey FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT payment_vouchers_credit_account_id_fkey FOREIGN KEY (credit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT payment_vouchers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT payment_vouchers_related_expense_id_fkey FOREIGN KEY (related_expense_id) REFERENCES public.expenses(id),
  CONSTRAINT payment_vouchers_sub_claim_id_fkey FOREIGN KEY (sub_claim_id) REFERENCES public.sub_claims(id)
);
CREATE TABLE public.payroll_slips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  emp_id uuid,
  month text NOT NULL,
  basic_salary double precision DEFAULT 0,
  total_advances double precision DEFAULT 0,
  total_deductions double precision DEFAULT 0,
  net_salary double precision NOT NULL,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  amount_to_pay numeric DEFAULT 0,
  allowances numeric DEFAULT 0,
  status text DEFAULT 'غير مدفوع'::text,
  CONSTRAINT payroll_slips_pkey PRIMARY KEY (id),
  CONSTRAINT payroll_slips_emp_id_fkey FOREIGN KEY (emp_id) REFERENCES public.partners(id)
);
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  unit text,
  current_stock double precision DEFAULT 0,
  avg_price double precision DEFAULT 0,
  CONSTRAINT inventory_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text,
  priority text DEFAULT 'normal'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT user_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  category text,
  subject text NOT NULL,
  details text,
  status text DEFAULT 'pending'::text,
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_requests_pkey PRIMARY KEY (id),
  CONSTRAINT user_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL,
  theme_config jsonb DEFAULT '{"brand_gold": "#C5A059", "glass_blur": "15px", "bg_gradient": "linear-gradient(180deg, #43342E 0%, #8C6A5D 100%)", "glass_opacity": 0.7}'::jsonb,
  privacy_settings jsonb DEFAULT '{"show_activity_log": true, "show_online_status": true}'::jsonb,
  notifications jsonb DEFAULT '{"email_alerts": true, "push_notifications": false}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.journal_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  error_type text,
  description text,
  is_fixed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journal_errors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contractor_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contractor_id uuid,
  project_id uuid,
  boq_item_id uuid,
  assigned_qty numeric,
  unit_price numeric,
  status text DEFAULT 'جاري التنفيذ'::text,
  boq_budget_id uuid,
  claim_id uuid,
  villa_name text,
  villa_number text,
  job_order_id uuid,
  CONSTRAINT contractor_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT contractor_assignments_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.partners(id),
  CONSTRAINT contractor_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT contractor_assignments_boq_item_id_fkey FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id),
  CONSTRAINT contractor_assignments_boq_budget_id_fkey FOREIGN KEY (boq_budget_id) REFERENCES public.boq_budget(id),
  CONSTRAINT contractor_assignments_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sub_claims(id),
  CONSTRAINT contractor_assignments_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.job_orders(id)
);
CREATE TABLE public.sub_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  claim_number text UNIQUE,
  contractor_id uuid,
  project_id uuid,
  date date DEFAULT CURRENT_DATE,
  total_amount numeric DEFAULT 0,
  retention_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'مسودة'::text,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  jv_header_id uuid,
  deductions_amount numeric DEFAULT 0,
  advance_payment numeric DEFAULT 0,
  materials_deduction numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  jv_id uuid,
  paid_amount numeric DEFAULT 0,
  payment_period_days integer DEFAULT 14,
  job_order_id uuid,
  project_ids ARRAY,
  project_names_text text,
  CONSTRAINT sub_claims_pkey PRIMARY KEY (id),
  CONSTRAINT sub_claims_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.partners(id),
  CONSTRAINT sub_claims_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT sub_claims_jv_header_id_fkey FOREIGN KEY (jv_header_id) REFERENCES public.journal_headers(id),
  CONSTRAINT sub_claims_jv_id_fkey FOREIGN KEY (jv_id) REFERENCES public.journal_headers(id),
  CONSTRAINT sub_claims_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.job_orders(id)
);
CREATE TABLE public.boq_budget (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  parent_id uuid,
  item_type character varying DEFAULT 'رئيسي'::character varying,
  work_item text NOT NULL,
  contract_quantity numeric DEFAULT 0,
  unit text DEFAULT 'مقطوعية'::text,
  unit_contract_price numeric DEFAULT 0,
  estimated_labor_cost numeric DEFAULT 0,
  main_category character varying,
  sub_category character varying,
  estimated_expenses_cost numeric DEFAULT 0,
  boq_item_id uuid,
  start_date date,
  end_date date,
  actual_quantity numeric DEFAULT 0,
  Property text,
  estimated_material_cost numeric DEFAULT 0,
  actual_labor_cost numeric DEFAULT 0,
  actual_expenses_cost numeric DEFAULT 0,
  actual_material_cost numeric DEFAULT 0,
  retention_percentage numeric DEFAULT 10,
  total_contract_amount numeric DEFAULT (contract_quantity * unit_contract_price),
  actual_retention_amount numeric DEFAULT ((contract_quantity * unit_contract_price) * (retention_percentage / 100.0)),
  material_variance numeric DEFAULT (COALESCE(estimated_material_cost, (0)::numeric) - COALESCE(actual_material_cost, (0)::numeric)),
  expenses_variance numeric DEFAULT (COALESCE(estimated_expenses_cost, (0)::numeric) - COALESCE(actual_expenses_cost, (0)::numeric)),
  actual_revenue numeric DEFAULT 0.00,
  completed_percentage numeric DEFAULT 
CASE
    WHEN (contract_quantity > (0)::numeric) THEN ((actual_quantity / contract_quantity) * (100)::numeric)
    ELSE (0)::numeric
END,
  labor_variance numeric DEFAULT (COALESCE(estimated_labor_cost, (0)::numeric) - COALESCE(actual_labor_cost, (0)::numeric)),
  created_at timestamp with time zone DEFAULT now(),
  execution_status character varying DEFAULT 'لم يتم البدئ'::character varying,
  item_net_profit numeric DEFAULT (((((contract_quantity * unit_contract_price) - ((contract_quantity * unit_contract_price) * (retention_percentage / 100.0))) - COALESCE(actual_expenses_cost, (0)::numeric)) - COALESCE(actual_material_cost, (0)::numeric)) - COALESCE(actual_labor_cost, (0)::numeric)),
  total_budget_variance numeric DEFAULT (((COALESCE(estimated_material_cost, (0)::numeric) + COALESCE(estimated_expenses_cost, (0)::numeric)) + COALESCE(estimated_labor_cost, (0)::numeric)) - ((COALESCE(actual_material_cost, (0)::numeric) + COALESCE(actual_expenses_cost, (0)::numeric)) + COALESCE(actual_labor_cost, (0)::numeric))),
  budget_code text DEFAULT ('BGT-'::text || nextval('boq_budget_code_seq'::regclass)) UNIQUE,
  loaded_amount_egp numeric DEFAULT 0,
  loaded_amount numeric DEFAULT 0,
  CONSTRAINT boq_budget_pkey PRIMARY KEY (id),
  CONSTRAINT boq_budget_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT boq_budget_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.boq_budget(id),
  CONSTRAINT boq_budget_boq_item_id_fkey FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id)
);
CREATE TABLE public.material_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  receipt_number character varying UNIQUE,
  project_id uuid,
  supplier_id uuid,
  account_id uuid,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric DEFAULT 0,
  status character varying DEFAULT 'مُعتمد'::character varying,
  attachments ARRAY,
  is_posted boolean DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  receipt_type character varying DEFAULT 'توريد شركة'::character varying,
  jv_id uuid,
  CONSTRAINT material_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT material_receipts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT material_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.partners(id),
  CONSTRAINT material_receipts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT material_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT material_receipts_jv_id_fkey FOREIGN KEY (jv_id) REFERENCES public.journal_headers(id)
);
CREATE TABLE public.material_receipt_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  receipt_id uuid,
  item_name character varying NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit character varying DEFAULT 'وحدة'::character varying,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  boq_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  project_id uuid,
  item_id uuid,
  boq_item_id uuid,
  CONSTRAINT material_receipt_lines_pkey PRIMARY KEY (id),
  CONSTRAINT material_receipt_lines_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.material_receipts(id),
  CONSTRAINT material_receipt_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT fk_material_receipt_item FOREIGN KEY (item_id) REFERENCES public.material_items(id),
  CONSTRAINT fk_receipt_lines_boq_budget FOREIGN KEY (boq_id) REFERENCES public.boq_budget(id),
  CONSTRAINT fk_receipt_lines_boq_items FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id)
);
CREATE TABLE public.violations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date DEFAULT CURRENT_DATE,
  partner_id uuid,
  emp_name text,
  profession text,
  project_id uuid,
  site_name text,
  reason text,
  amount numeric,
  image_url text,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  debit_account_id uuid,
  credit_account_id uuid,
  violation_type text DEFAULT 'غرامة'::text,
  boq_item_id uuid,
  is_deleted boolean DEFAULT false,
  CONSTRAINT violations_pkey PRIMARY KEY (id),
  CONSTRAINT violations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT violations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT violations_debit_account_id_fkey FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT violations_credit_account_id_fkey FOREIGN KEY (credit_account_id) REFERENCES public.accounts(id),
  CONSTRAINT fk_violations_boq_item FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exp_date date NOT NULL DEFAULT CURRENT_DATE,
  sub_contractor text,
  payee_id uuid,
  creditor_account text,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  vat_amount numeric DEFAULT 0 CHECK (vat_amount >= 0::numeric),
  discount_amount numeric DEFAULT 0,
  discount_account character varying,
  paid_amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'كاش'::text CHECK (payment_method = ANY (ARRAY['كاش'::text, 'تحويل بنكي'::text, 'شيك'::text, 'عُهدة'::text, 'آجل'::text, 'تسوية داخلية'::text])),
  payment_account text DEFAULT '125 - عُهد الموظفين والمواقع'::text,
  notes text,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  site_ref text,
  payee_name text,
  project_id uuid,
  employee_name character varying,
  invoice_image text,
  lines_data jsonb DEFAULT '[]'::jsonb,
  is_deducted_in_claim boolean DEFAULT false,
  claim_id uuid,
  is_auto_distributed boolean DEFAULT false,
  total_price numeric DEFAULT (quantity * unit_price),
  main_category text,
  is_deleted boolean DEFAULT false,
  job_order_id uuid,
  is_deducted_from_contractor boolean DEFAULT false,
  created_by uuid,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT expenses_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES public.partners(id),
  CONSTRAINT expenses_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.job_orders(id)
);
CREATE TABLE public.material_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issue_number character varying NOT NULL,
  project_id uuid,
  subcontractor_id uuid,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  issue_type character varying DEFAULT 'صرف لمقاول'::character varying,
  total_amount numeric DEFAULT 0,
  notes text,
  jv_id uuid,
  is_posted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  claim_id uuid,
  contractor_text_name character varying,
  CONSTRAINT material_issues_pkey PRIMARY KEY (id),
  CONSTRAINT material_issues_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT material_issues_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.partners(id),
  CONSTRAINT material_issues_jv_id_fkey FOREIGN KEY (jv_id) REFERENCES public.journal_headers(id),
  CONSTRAINT material_issues_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sub_claims(id)
);
CREATE TABLE public.material_issue_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issue_id uuid,
  item_name character varying NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit character varying DEFAULT 'وحدة'::character varying,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  boq_id uuid,
  boq_item_id uuid,
  item_id uuid,
  job_order_id uuid,
  is_deducted_from_contractor boolean DEFAULT false,
  claim_id uuid,
  CONSTRAINT material_issue_lines_pkey PRIMARY KEY (id),
  CONSTRAINT material_issue_lines_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.material_issues(id),
  CONSTRAINT material_issue_lines_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boq_budget(id),
  CONSTRAINT material_issue_lines_boq_item_id_fkey FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id),
  CONSTRAINT fk_material_issue_item FOREIGN KEY (item_id) REFERENCES public.material_items(id),
  CONSTRAINT material_issue_lines_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.job_orders(id),
  CONSTRAINT fk_material_lines_claim FOREIGN KEY (claim_id) REFERENCES public.sub_claims(id)
);
CREATE TABLE public.material_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_code character varying UNIQUE,
  item_name character varying NOT NULL UNIQUE,
  main_category character varying,
  default_unit character varying DEFAULT 'بالقطعة'::character varying,
  default_unit_price numeric DEFAULT 0.00,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  boq_item_id uuid,
  CONSTRAINT material_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_material_items_boq_item FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id)
);
CREATE TABLE public.cash_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  flow_type character varying NOT NULL CHECK (flow_type::text = ANY (ARRAY['inflow'::character varying, 'outflow'::character varying]::text[])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  category character varying NOT NULL,
  sub_category text,
  payment_method character varying DEFAULT 'نقدي'::character varying,
  reference_number character varying,
  description text,
  account_id uuid,
  project_id uuid,
  partner_id uuid,
  is_reconciled boolean DEFAULT false,
  reconciled_date date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  source_id uuid,
  source_type character varying,
  CONSTRAINT cash_flows_pkey PRIMARY KEY (id),
  CONSTRAINT cash_flows_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT cash_flows_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT cash_flows_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.temp_labor_daily_logs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  work_date text,
  worker_name text,
  site_ref text,
  work_item text,
  unit text,
  skill_level text,
  daily_wage bigint,
  attendance_value double precision,
  sub_contractor text,
  notes text,
  project_id text,
  created_at text,
  worker_partner_id text,
  sub_contractor_id text,
  is_posted text,
  work_item_id text,
  tareeha text,
  productivity bigint,
  completion_percentage text,
  credit_account_id text,
  debit_account_id text,
  production_desc text,
  completed_quantity text,
  number_of_workers text,
  CONSTRAINT temp_labor_daily_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.financial_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_year integer NOT NULL,
  plan_month integer NOT NULL,
  category text NOT NULL,
  item_name text NOT NULL,
  planned_amount numeric DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  notes text,
  CONSTRAINT financial_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  project_id uuid,
  boq_budget_id uuid,
  executor_type text DEFAULT 'تنفيذ ذاتي'::text CHECK (executor_type = ANY (ARRAY['تنفيذ ذاتي'::text, 'مقاول باطن'::text])),
  contractor_id uuid,
  assigned_qty numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  status text DEFAULT 'جاري التنفيذ'::text CHECK (status = ANY (ARRAY['مسودة'::text, 'جاري التنفيذ'::text, 'موقوف'::text, 'مكتمل'::text])),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_orders_pkey PRIMARY KEY (id),
  CONSTRAINT job_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT job_orders_boq_budget_id_fkey FOREIGN KEY (boq_budget_id) REFERENCES public.boq_budget(id),
  CONSTRAINT job_orders_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.partners(id)
);