-- 1. دالة حماية رؤوس القيود
CREATE OR REPLACE FUNCTION protect_journal_headers()
RETURNS TRIGGER AS $$
BEGIN
    -- 🛑 منع تعديل القيود المرحلة
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('مرحل', 'معتمد') THEN
            -- السماح للمستخدم بتغيير الحالة فقط إلى (مسودة) أو (ملغي) في حالة فك الترحيل
            -- مع منع تغيير أي بيانات جوهرية أخرى
            IF NEW.status NOT IN ('مرحل', 'معتمد') THEN
                IF NEW.entry_date != OLD.entry_date OR NEW.description != OLD.description THEN
                     RAISE EXCEPTION 'مرفوض: يجب فك الترحيل أولاً لتعديل البيانات الأساسية.';
                END IF;
                RETURN NEW;
            END IF;
            
            -- إذا حاول التعديل مع إبقاء الحالة "مرحل"
            IF NEW.description != OLD.description OR NEW.entry_date != OLD.entry_date OR NEW.reference_id != OLD.reference_id THEN
                RAISE EXCEPTION 'مرفوض: لا يمكن تعديل قيد حالته % (يرجى فك الترحيل أولاً)', OLD.status;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- تم السماح بعملية الـ DELETE من قاعدة البيانات لتسمح لنظام (فك الترحيل) بحذف القيد تلقائياً.
    -- (تم حظر الحذف اليدوي من شاشة الواجهة بشكل منفصل).
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_journal_headers ON journal_headers;
CREATE TRIGGER trg_protect_journal_headers
BEFORE UPDATE ON journal_headers
FOR EACH ROW
EXECUTE FUNCTION protect_journal_headers();


-- 2. دالة حماية سطور القيود (التفاصيل)
CREATE OR REPLACE FUNCTION protect_journal_lines()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    -- جلب حالة القيد
    SELECT status INTO v_status FROM journal_headers WHERE id = NEW.header_id;

    IF v_status IN ('مرحل', 'معتمد') THEN
        IF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'مرفوض: لا يمكن تعديل مبالغ أو حسابات لسطر في قيد مرحل';
        ELSIF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'مرفوض: لا يمكن إضافة سطر جديد لقيد مرحل';
        END IF;
    END IF;

    -- تم تجاوز عملية DELETE هنا أيضاً للسماح بالـ CASCADE عندما يقوم النظام بمسح الرأس أثناء فك الترحيل
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_journal_lines ON journal_lines;
CREATE TRIGGER trg_protect_journal_lines
BEFORE INSERT OR UPDATE ON journal_lines
FOR EACH ROW
EXECUTE FUNCTION protect_journal_lines();
