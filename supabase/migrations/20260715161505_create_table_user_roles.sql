-- tables
CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);

-- consraints
ALTER TABLE public.user_roles ADD CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT fk_role_permissions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.user_roles TO service_role;
