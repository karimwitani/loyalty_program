-- table
CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);

-- constraints
ALTER TABLE public.role_permissions ADD CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE public.role_permissions ADD CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.role_permissions TO service_role;
