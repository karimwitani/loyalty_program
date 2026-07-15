-- enum
CREATE TYPE public.enum_reward_program_type AS ENUM ('point_program', 'reward_program');

-- table
CREATE TABLE public.reward_programs (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    title text NOT NULL,
    org_id uuid NOT NULL,
    type public.enum_reward_program_type NOT NULL,
    reward_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- constraint
ALTER TABLE public.reward_programs ADD CONSTRAINT fk_reward_programs_org_id FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.reward_programs ADD CONSTRAINT fk_reward_programs_reward_id FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL;
ALTER TABLE public.reward_programs ADD CONSTRAINT pk_reward_programs PRIMARY KEY (id);

-- permission
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.reward_programs TO service_role;

-- trigger
CREATE TRIGGER trg_reward_programs_handle_updated_at BEFORE UPDATE ON public.reward_programs FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
