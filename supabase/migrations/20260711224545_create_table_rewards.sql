-- TABLE
CREATE TABLE public.rewards (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    name text NOT NULL,
    required_points integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
-- CONSTRAINTS
ALTER TABLE public.rewards ADD CONSTRAINT check_required_points_positive CHECK (required_points > 0);
ALTER TABLE public.rewards ADD CONSTRAINT pk_rewards PRIMARY KEY (id);

-- PERMISSIONS
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.rewards TO service_role;

-- TRIGGERS
CREATE TRIGGER trg_rewards_handle_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
