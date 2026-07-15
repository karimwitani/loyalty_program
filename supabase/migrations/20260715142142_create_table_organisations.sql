-- table
CREATE TABLE public.organisations (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- constraint
ALTER TABLE public.organisations ADD CONSTRAINT pk_organisations PRIMARY KEY (id);

-- permssion
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.organisations TO service_role;

-- trigger
CREATE TRIGGER trg_organisations_handle_updated_at BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
