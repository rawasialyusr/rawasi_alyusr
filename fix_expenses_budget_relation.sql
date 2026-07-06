-- 1. Drop old text-matching trigger
DROP TRIGGER IF EXISTS trg_update_boq_direct_expenses_live ON public.expenses;
DROP FUNCTION IF EXISTS public.update_boq_direct_expenses_live() CASCADE;

-- 2. Create trigger on expenses to force boq update when expenses on a job order change
CREATE OR REPLACE FUNCTION public.trigger_boq_update_from_expenses()
RETURNS trigger AS $$
DECLARE
    v_boq_id uuid;
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.job_order_id IS NOT NULL THEN
        SELECT boq_budget_id INTO v_boq_id FROM public.job_orders WHERE id = OLD.job_order_id;
        IF v_boq_id IS NOT NULL THEN
            UPDATE public.boq_budget SET id = id WHERE id = v_boq_id;
        END IF;
    END IF;

    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.job_order_id IS NOT NULL THEN
        SELECT boq_budget_id INTO v_boq_id FROM public.job_orders WHERE id = NEW.job_order_id;
        IF v_boq_id IS NOT NULL THEN
            UPDATE public.boq_budget SET id = id WHERE id = v_boq_id;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boq_update_from_expenses ON public.expenses;
CREATE TRIGGER trg_boq_update_from_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trigger_boq_update_from_expenses();

-- 3. Modify update_boq_actuals to aggregate both ABC and job_order expenses
CREATE OR REPLACE FUNCTION public.update_boq_actuals()
RETURNS trigger AS $$
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        
        -- 1. العمالة المباشرة
        NEW.actual_quantity := (SELECT COALESCE(SUM(productivity), 0) FROM public.labor_daily_logs WHERE project_id = NEW.project_id AND (work_item_id = NEW.id OR work_item_id = NEW.boq_item_id));
        NEW.actual_labor_cost := (SELECT COALESCE(SUM(daily_wage), 0) FROM public.labor_daily_logs WHERE project_id = NEW.project_id AND (work_item_id = NEW.id OR work_item_id = NEW.boq_item_id));
        
        -- 2. الخامات المباشرة
        NEW.actual_material_cost := (SELECT COALESCE(SUM(mil.total_price), 0) FROM public.material_issue_lines mil JOIN public.material_issues mi ON mi.id = mil.issue_id WHERE mi.project_id = NEW.project_id AND (mil.boq_item_id = NEW.boq_item_id OR mil.boq_id = NEW.id));
        
        -- 3. المصروفات الموزعة + المصروفات المباشرة المرتبطة بأوامر الشغل
        NEW.actual_expenses_cost := (
            SELECT COALESCE(SUM("المبلغ المحمل (ر.س)"), 0)
            FROM public.advanced_cost_allocation_view
            WHERE project_id = NEW.project_id 
              AND (boq_budget_id = NEW.boq_item_id OR boq_budget_id = NEW.id)
        ) + (
            SELECT COALESCE(SUM(e.total_price), 0)
            FROM public.expenses e
            JOIN public.job_orders jo ON e.job_order_id = jo.id
            WHERE e.project_id = NEW.project_id
              AND (jo.boq_budget_id = NEW.id OR jo.boq_budget_id = NEW.boq_item_id)
        );

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Force update all boq_budget rows to recalculate
UPDATE public.boq_budget SET id = id;
