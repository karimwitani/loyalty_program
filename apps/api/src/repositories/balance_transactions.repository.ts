import {
    BalanceTransactionSchema,
    BalanceTransactionListQuery,
    BalanceTransactionPage,
} from "@/domain/types/balance_transactions.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const BALANCE_TRANSACTIONS_SELECT_QUERY = `
    id,
    balance_id,
    type,
    amount,
    created_at,
    updated_at
`

export interface IBalanceTransactionsRepository {
    findByBalanceId: (balanceId: string, query: BalanceTransactionListQuery) => Promise<BalanceTransactionPage>;
}

export class BalanceTransactionsRepository implements IBalanceTransactionsRepository {
    public async findByBalanceId(
        balanceId: string,
        query: BalanceTransactionListQuery,
    ): Promise<BalanceTransactionPage> {
        const { page_size, starting_after } = query;

        let builder = supabase
            .from("balance_transactions")
            .select(BALANCE_TRANSACTIONS_SELECT_QUERY)
            .eq("balance_id", balanceId)
            .order("id", { ascending: false })
            .limit(page_size + 1);

        if (starting_after) {
            builder = builder.lt("id", starting_after);
        }

        const { data, error } = await builder;

        if (error) {
            throw toPostgrestError(error);
        }

        const rows = (data ?? []).map((row) => BalanceTransactionSchema.parse(row));

        const has_more = rows.length > page_size;
        const page = has_more ? rows.slice(0, page_size) : rows;
        const next_cursor = has_more ? page[page.length - 1]!.id : null;

        return { data: page, has_more, next_cursor };
    }
}
