ALTER TABLE public.rewards ADD COLUMN org_id uuid NOT NULL;
ALTER TABLE public.rewards ADD CONSTRAINT fk_rewards_org_id FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX idx_rewards_org_id ON public.rewards (org_id);
