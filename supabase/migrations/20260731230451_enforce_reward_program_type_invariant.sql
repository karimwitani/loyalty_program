SET check_function_bodies = false;
ALTER TABLE public.reward_programs DROP CONSTRAINT fk_reward_programs_reward_id;
CREATE FUNCTION public.fn_create_reward_program_with_reward(p_org_id uuid, p_title text, p_reward_name text, p_reward_required_points integer)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_reward_id uuid;
  v_reward_program_id uuid;
BEGIN
	IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
		RAISE EXCEPTION 'title must not be empty';
	END IF;

	INSERT INTO rewards (org_id, name, required_points)
	VALUES (p_org_id, p_reward_name, p_reward_required_points)
	RETURNING id INTO v_reward_id;

	INSERT INTO reward_programs (org_id, title, type, reward_id)
	VALUES (p_org_id, p_title, 'reward_program', v_reward_id)
	RETURNING id INTO v_reward_program_id;

	RETURN v_reward_program_id;
END
$function$;
ALTER TABLE public.reward_programs ADD CONSTRAINT check_reward_programs_type_reward_id CHECK (type = 'reward_program'::public.enum_reward_program_type AND reward_id IS NOT NULL OR type = 'point_program'::public.enum_reward_program_type AND reward_id IS NULL);
ALTER TABLE public.reward_programs ADD CONSTRAINT fk_reward_programs_reward_id FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE RESTRICT;
CREATE INDEX idx_reward_programs_org_id ON public.reward_programs (org_id);
CREATE INDEX idx_reward_programs_reward_id ON public.reward_programs (reward_id);
