-- إزالة تريجرات الحماية التي سببت مشكلة فك الترحيل
DROP TRIGGER IF EXISTS trg_protect_journal_headers ON journal_headers;
DROP FUNCTION IF EXISTS protect_journal_headers();

DROP TRIGGER IF EXISTS trg_protect_journal_lines ON journal_lines;
DROP FUNCTION IF EXISTS protect_journal_lines();
