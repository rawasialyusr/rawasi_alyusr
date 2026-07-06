CREATE OR REPLACE FUNCTION public.get_comprehensive_dashboard(start_date date, end_date date) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  exp_posted NUMERIC;
  exp_pending NUMERIC;
  pv_posted NUMERIC;
  pv_pending NUMERIC;
  rv_posted NUMERIC;
  rv_pending NUMERIC;
  inv_posted NUMERIC;
  inv_pending NUMERIC;
  labor_posted NUMERIC;
  labor_pending NUMERIC;
  advances NUMERIC;
  deductions NUMERIC;
  violations_amt NUMERIC;
BEGIN
  -- 1. المصروفات (expenses)
  SELECT COALESCE(SUM(total_price), 0) INTO exp_posted FROM expenses WHERE is_posted = true AND exp_date BETWEEN start_date AND end_date;
  SELECT COALESCE(SUM(total_price), 0) INTO exp_pending FROM expenses WHERE is_posted = false AND exp_date BETWEEN start_date AND end_date;

  -- 2. سندات الصرف (payment_vouchers)
  SELECT COALESCE(SUM(amount), 0) INTO pv_posted FROM payment_vouchers WHERE is_posted = true AND date BETWEEN start_date AND end_date;
  SELECT COALESCE(SUM(amount), 0) INTO pv_pending FROM payment_vouchers WHERE is_posted = false AND date BETWEEN start_date AND end_date;

  -- 3. سندات القبض (receipt_vouchers)
  SELECT COALESCE(SUM(amount), 0) INTO rv_posted FROM receipt_vouchers WHERE status = 'مرحل' AND date BETWEEN start_date AND end_date;
  SELECT COALESCE(SUM(amount), 0) INTO rv_pending FROM receipt_vouchers WHERE status != 'مرحل' AND date BETWEEN start_date AND end_date;

  -- 4. فواتير العملاء (invoices)
  SELECT COALESCE(SUM(total_amount), 0) INTO inv_posted FROM invoices WHERE status = 'مرحل' AND date BETWEEN start_date AND end_date;
  SELECT COALESCE(SUM(total_amount), 0) INTO inv_pending FROM invoices WHERE status != 'مرحل' AND date BETWEEN start_date AND end_date;

  -- 5. يوميات العمال (labor_daily_logs)
  SELECT COALESCE(SUM(daily_wage * attendance_value), 0) INTO labor_posted FROM labor_daily_logs WHERE is_posted = true AND work_date BETWEEN start_date AND end_date;
  SELECT COALESCE(SUM(daily_wage * attendance_value), 0) INTO labor_pending FROM labor_daily_logs WHERE is_posted = false AND work_date BETWEEN start_date AND end_date;

  -- 6. السلف والخصومات والمخالفات
  -- تم إزالة الجداول الخاصة بالسلف والخصومات لعدم الاستخدام
  advances := 0;
  deductions := 0;
  SELECT COALESCE(SUM(amount), 0) INTO violations_amt FROM violations WHERE is_posted = true AND date BETWEEN start_date AND end_date;

  -- إرجاع النتيجة ككائن JSON واحد
  RETURN json_build_object(
    'expenses', json_build_object('posted', exp_posted, 'pending', exp_pending, 'total', exp_posted + exp_pending),
    'payment_vouchers', json_build_object('posted', pv_posted, 'pending', pv_pending, 'total', pv_posted + pv_pending),
    'receipt_vouchers', json_build_object('posted', rv_posted, 'pending', rv_pending, 'total', rv_posted + rv_pending),
    'invoices', json_build_object('posted', inv_posted, 'pending', inv_pending, 'total', inv_posted + inv_pending),
    'labor', json_build_object('posted', labor_posted, 'pending', labor_pending, 'total', labor_posted + labor_pending),
    'hr', json_build_object('advances', advances, 'deductions', deductions, 'violations', violations_amt)
  );
END;
$$;
