-- table
CREATE TABLE public.roles (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    name text NOT NULL,
    scope text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- PK
ALTER TABLE public.roles ADD CONSTRAINT pk_roles PRIMARY KEY (id);

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.roles TO service_role;

-- trigger
CREATE TRIGGER trg_roles_handle_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
