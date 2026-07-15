-- enum
CREATE TYPE public.enum_balance_transaction_type AS ENUM ('credit', 'debit');

-- table
CREATE TABLE public.balance_transactions (
    id uuid DEFAULT public.fn_gen_random_uuid_v7() NOT NULL,
    balance_id uuid NOT NULL,
    type public.enum_balance_transaction_type NOT NULL,
    amount integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- constraints
ALTER TABLE public.balance_transactions ADD CONSTRAINT fk_balance_transactions_balance_id FOREIGN KEY (balance_id) REFERENCES public.balances(id) ON DELETE CASCADE;
ALTER TABLE public.balance_transactions ADD CONSTRAINT pk_balance_transactions PRIMARY KEY (id);

-- permissions
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.balance_transactions TO service_role;

-- trigger
CREATE TRIGGER trg_balance_transactions_handle_updated_at BEFORE UPDATE ON public.balance_transactions FOR EACH ROW EXECUTE FUNCTION public.fn_handle_updated_at();
