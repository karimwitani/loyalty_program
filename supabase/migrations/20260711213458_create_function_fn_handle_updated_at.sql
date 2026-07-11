SET check_function_bodies = false;
CREATE FUNCTION public.fn_handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_handle_updated_at() FROM service_role;