-- 1. Create the cache table
CREATE TABLE IF NOT EXISTS public.sys_financial_reports (
    report_name VARCHAR(50) PRIMARY KEY,
    report_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Function to recalculate and update the cache
CREATE OR REPLACE FUNCTION public.generate_financial_reports_json()
RETURNS void AS $$
DECLARE
    income_statement JSONB;
    balance_sheet JSONB;
    v_revenues JSONB;
    v_expenses JSONB;
    v_total_revenue NUMERIC := 0;
    v_total_expense NUMERIC := 0;
    v_net_income NUMERIC := 0;

    v_assets JSONB;
    v_liabilities JSONB;
    v_equity JSONB;
    v_total_assets NUMERIC := 0;
    v_total_liabilities NUMERIC := 0;
    v_total_equity NUMERIC := 0;
BEGIN
    ---------------------------------------------------------------------------
    -- A) INCOME STATEMENT (قائمة الدخل)
    ---------------------------------------------------------------------------
    -- Revenues (إيرادات): Credit - Debit
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(bal.balance, 0))), '[]'::jsonb),
           COALESCE(SUM(bal.balance), 0)
    INTO v_revenues, v_total_revenue
    FROM public.accounts a
    LEFT JOIN (
        SELECT jl.account_id, SUM(jl.credit - jl.debit) as balance
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jl.header_id = jh.id
        WHERE jh.status = 'معتمد'
        GROUP BY jl.account_id
    ) bal ON a.id = bal.account_id
    WHERE a.account_type = 'إيرادات' AND COALESCE(bal.balance, 0) != 0;

    -- Expenses (مصروفات): Debit - Credit
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(bal.balance, 0))), '[]'::jsonb),
           COALESCE(SUM(bal.balance), 0)
    INTO v_expenses, v_total_expense
    FROM public.accounts a
    LEFT JOIN (
        SELECT jl.account_id, SUM(jl.debit - jl.credit) as balance
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jl.header_id = jh.id
        WHERE jh.status = 'معتمد'
        GROUP BY jl.account_id
    ) bal ON a.id = bal.account_id
    WHERE a.account_type = 'مصروفات' AND COALESCE(bal.balance, 0) != 0;

    -- Calculate Net Income
    v_net_income := COALESCE(v_total_revenue, 0) - COALESCE(v_total_expense, 0);

    -- Build Income Statement JSON
    income_statement := jsonb_build_object(
        'revenues', v_revenues,
        'expenses', v_expenses,
        'total_revenue', v_total_revenue,
        'total_expense', v_total_expense,
        'net_income', v_net_income
    );

    ---------------------------------------------------------------------------
    -- B) BALANCE SHEET (المركز المالي)
    ---------------------------------------------------------------------------
    -- Assets (أصول): Debit - Credit
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(bal.balance, 0))), '[]'::jsonb),
           COALESCE(SUM(bal.balance), 0)
    INTO v_assets, v_total_assets
    FROM public.accounts a
    LEFT JOIN (
        SELECT jl.account_id, SUM(jl.debit - jl.credit) as balance
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jl.header_id = jh.id
        WHERE jh.status = 'معتمد'
        GROUP BY jl.account_id
    ) bal ON a.id = bal.account_id
    WHERE a.account_type = 'أصول' AND COALESCE(bal.balance, 0) != 0;

    -- Liabilities (التزامات): Credit - Debit
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(bal.balance, 0))), '[]'::jsonb),
           COALESCE(SUM(bal.balance), 0)
    INTO v_liabilities, v_total_liabilities
    FROM public.accounts a
    LEFT JOIN (
        SELECT jl.account_id, SUM(jl.credit - jl.debit) as balance
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jl.header_id = jh.id
        WHERE jh.status = 'معتمد'
        GROUP BY jl.account_id
    ) bal ON a.id = bal.account_id
    WHERE a.account_type = 'التزامات' AND COALESCE(bal.balance, 0) != 0;

    -- Equity (حقوق ملكية): Credit - Debit
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(bal.balance, 0))), '[]'::jsonb),
           COALESCE(SUM(bal.balance), 0)
    INTO v_equity, v_total_equity
    FROM public.accounts a
    LEFT JOIN (
        SELECT jl.account_id, SUM(jl.credit - jl.debit) as balance
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jl.header_id = jh.id
        WHERE jh.status = 'معتمد'
        GROUP BY jl.account_id
    ) bal ON a.id = bal.account_id
    WHERE a.account_type = 'حقوق ملكية' AND COALESCE(bal.balance, 0) != 0;

    -- Build Balance Sheet JSON
    balance_sheet := jsonb_build_object(
        'assets', v_assets,
        'liabilities', v_liabilities,
        'equity', v_equity,
        'total_assets', v_total_assets,
        'total_liabilities', v_total_liabilities,
        'total_equity', v_total_equity,
        'net_income', v_net_income,
        'total_liabilities_and_equity', v_total_liabilities + v_total_equity + v_net_income
    );

    ---------------------------------------------------------------------------
    -- C) UPSERT TO CACHE TABLE
    ---------------------------------------------------------------------------
    INSERT INTO public.sys_financial_reports (report_name, report_data, updated_at)
    VALUES ('IncomeStatement', income_statement, NOW())
    ON CONFLICT (report_name) DO UPDATE SET report_data = EXCLUDED.report_data, updated_at = NOW();

    INSERT INTO public.sys_financial_reports (report_name, report_data, updated_at)
    VALUES ('BalanceSheet', balance_sheet, NOW())
    ON CONFLICT (report_name) DO UPDATE SET report_data = EXCLUDED.report_data, updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- 3. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.trg_refresh_financial_reports()
RETURNS TRIGGER AS $$
BEGIN
    -- We simply call the generator asynchronously or synchronously
    -- It takes a fraction of a second so running it synchronously is fine.
    PERFORM public.generate_financial_reports_json();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Triggers to journal_lines and journal_headers (Statement level to prevent bulk insert slowdowns)
DROP TRIGGER IF EXISTS trg_refresh_financial_reports_lines ON public.journal_lines;
CREATE TRIGGER trg_refresh_financial_reports_lines
AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_refresh_financial_reports();

DROP TRIGGER IF EXISTS trg_refresh_financial_reports_headers ON public.journal_headers;
CREATE TRIGGER trg_refresh_financial_reports_headers
AFTER UPDATE OF status ON public.journal_headers
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_refresh_financial_reports();

-- 5. Do an initial run to populate the table!
SELECT public.generate_financial_reports_json();
