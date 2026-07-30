import { randomUUID } from "crypto";
import {
    BalanceTransaction,
    BalanceTransactionCreate,
    BalanceTransactionSchema,
    BalanceTransactionListQuery,
    BalanceTransactionPage,
} from "@/domain/types/balance_transactions.types";
import { IBalanceTransactionsRepository } from "@/repositories/balance_transactions.repository";

export class InMemoryBalanceTransactionsRepository implements IBalanceTransactionsRepository {
    private rows: Map<string, BalanceTransaction> = new Map();
    // Monotonic counter used to mint ids that sort the same way
    // `fn_gen_random_uuid_v7()` ids do in Postgres: lexicographically, and
    // therefore chronologically - newer rows get a "larger" id. Real UUIDv7
    // values encode a timestamp in their leading bits; this fake just
    // encodes an incrementing counter in the same leading position so
    // `ORDER BY id DESC` (real repo) and a string sort (this fake) agree.
    private sequence = 0;

    private nextId(): string {
        const hex = (this.sequence++).toString(16).padStart(12, "0");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    }

    // Not part of IBalanceTransactionsRepository - this repository is
    // read-only per the domain (transactions are only ever written by the
    // fn_increment_balance/fn_decrement_balance RPCs). Tests use this to
    // seed fixture rows directly instead of going through those RPCs.
    public seedTransaction(data: BalanceTransactionCreate): BalanceTransaction {
        const now = new Date().toISOString();
        const row = BalanceTransactionSchema.parse({
            id: this.nextId(),
            created_at: now,
            updated_at: now,
            ...data,
        });
        this.rows.set(row.id, row);
        return row;
    }

    public async findByBalanceId(
        balanceId: string,
        query: BalanceTransactionListQuery,
    ): Promise<BalanceTransactionPage> {
        const { page_size, starting_after } = query;

        let rows = [...this.rows.values()]
            .filter((row) => row.balance_id === balanceId)
            .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

        if (starting_after) {
            rows = rows.filter((row) => row.id < starting_after);
        }

        const page = rows.slice(0, page_size + 1);
        const has_more = page.length > page_size;
        const data = has_more ? page.slice(0, page_size) : page;
        const next_cursor = has_more ? data[data.length - 1]!.id : null;

        return { data, has_more, next_cursor };
    }
}
