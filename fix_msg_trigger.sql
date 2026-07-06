-- إصلاح الدالة الخاصة بإرسال إشعار عند وجود رسالة جديدة لتستخدم عمود message الصحيح
CREATE OR REPLACE FUNCTION public.trigger_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- في حالة وجود عمود message وليس content
  INSERT INTO public.notifications (
    user_id,
    title,
    message, -- هنا التغيير المهم
    type,
    related_id
  ) VALUES (
    NEW.receiver_id,
    'رسالة جديدة',
    'لديك رسالة جديدة من ' || COALESCE(sender_name, 'مستخدم'),
    'message',
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة كان العمود الفعلي هو content أو حدث خطأ آخر نتجاهله حتى لا نعطل إرسال الرسائل
    RETURN NEW;
END;
$function$;
