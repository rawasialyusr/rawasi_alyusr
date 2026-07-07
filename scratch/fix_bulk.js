const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const sql = `
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
            -- 1. إنشاء رأس القيد في اليومية (مسودة لتخطي تريجر الحماية)
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
                'مسودة',
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

            -- 4. تحديث حالة اليومية لتصبح مرحلة بعد إضافة السطور بنجاح
            UPDATE public.journal_headers
            SET status = 'مرحل'
            WHERE id = v_header_id;

            -- 5. تحديث حالة القيد اليدوي
            UPDATE public.manual_journals
            SET is_posted = true, status = 'معتمد'
            WHERE id = v_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if(error) console.error(error);
    else console.log('RPC fixed!');
}
run();
