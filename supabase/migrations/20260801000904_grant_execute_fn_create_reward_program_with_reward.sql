SET check_function_bodies = false;
GRANT ALL ON FUNCTION public.fn_decrement_balance(uuid, integer) TO service_role;
GRANT ALL ON FUNCTION public.fn_gen_random_uuid_v7() TO service_role;
GRANT ALL ON FUNCTION public.fn_handle_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.fn_increment_balance(uuid, integer) TO service_role;
