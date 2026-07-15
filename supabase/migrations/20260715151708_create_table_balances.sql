-- table
CREATE TABLE public.balances (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid NOT NULL,
    balance integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- constraints
ALTER TABLE public.balances ADD CONSTRAINT check_balance_positive CHECK (balance >= 0);
ALTER TABLE public.balances ADD CONSTRAINT fk_balances_programs_org_id FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.balances ADD CONSTRAINT fk_balances_programs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.balances ADD CONSTRAINT pk_balances PRIMARY KEY (id);

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.balances TO service_role;

-- triggers
CREATE TRIGGER trg_balances_handle_updated_at BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
