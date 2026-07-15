-- table
CREATE TABLE public.permissions (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- constraints
ALTER TABLE public.permissions ADD CONSTRAINT pk_permissions PRIMARY KEY (id);

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.permissions TO service_role;

-- triggers
CREATE TRIGGER trg_permissions_handle_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
