SET check_function_bodies = false;
ALTER TABLE public.balances DROP CONSTRAINT fk_balances_programs_org_id;
ALTER TABLE public.balances DROP COLUMN org_id;
REVOKE ALL ON FUNCTION public.fn_decrement_balance(uuid, integer) FROM service_role;
ALTER TABLE public.balances ADD COLUMN reward_program_id uuid NOT NULL;
ALTER TABLE public.balances ADD CONSTRAINT fk_balances_reward_program_id FOREIGN KEY (reward_program_id) REFERENCES public.reward_programs(id) ON DELETE CASCADE;
ALTER TABLE public.balances ADD CONSTRAINT uq_balances_reward_program_id_user_id UNIQUE (reward_program_id, user_id);
