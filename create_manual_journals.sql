CREATE TABLE IF NOT EXISTS public.manual_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    debit_account_id UUID NOT NULL REFERENCES public.accounts(id),
    credit_account_id UUID NOT NULL REFERENCES public.accounts(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    partner_id UUID REFERENCES public.partners(id),
    project_id UUID REFERENCES public.projects(id),
    status VARCHAR(20) DEFAULT 'مسودة',
    is_posted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID
);

-- إعطاء الصلاحيات للجدول الجديد
GRANT ALL ON TABLE public.manual_journals TO anon, authenticated, service_role;

-- دالة الترحيل
CREATE OR REPLACE FUNCTION public.post_manual_journals_bulk(p_ids UUID[])
RETURNS void AS $$
DECLARE
    v_id UUID;
    v_header_id UUID;
    v_journal RECORD;
BEGIN
    FOREACH v_id IN ARRAY p_ids
    LOOP
        -- جلب بيانات القيد
        SELECT * INTO v_journal
        FROM public.manual_journals
        WHERE id = v_id AND is_posted = false;

        IF FOUND THEN
            -- 1. إنشاء رأس القيد في اليومية
            INSERT INTO public.journal_headers (
                reference_id,
                entry_date,
                description,
                status,
                v_type
            ) VALUES (
                v_journal.id,
                v_journal.entry_date,
                v_journal.description,
                'مرحل',
                'manual_journals'
            ) RETURNING id INTO v_header_id;

            -- 2. إدخال الطرف المدين
            INSERT INTO public.journal_lines (
                header_id,
                account_id,
                debit,
                credit,
                partner_id,
                project_id,
                notes
            ) VALUES (
                v_header_id,
                v_journal.debit_account_id,
                v_journal.amount,
                0,
                v_journal.partner_id,
                v_journal.project_id,
                v_journal.description
            );

            -- 3. إدخال الطرف الدائن
            INSERT INTO public.journal_lines (
                header_id,
                account_id,
                debit,
                credit,
                partner_id,
                project_id,
                notes
            ) VALUES (
                v_header_id,
                v_journal.credit_account_id,
                0,
                v_journal.amount,
                v_journal.partner_id,
                v_journal.project_id,
                v_journal.description
            );

            -- 4. تحديث حالة القيد اليدوي
            UPDATE public.manual_journals
            SET is_posted = true, status = 'معتمد'
            WHERE id = v_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;