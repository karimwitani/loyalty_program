import { Container } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";

import { IBalancesRepository, BalancesRepository } from "@/repositories/balances.repositorty";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import { BalanceService } from "@/services/balances.service";
import { BalancesController } from "@/controllers/balances.controller";

export function buildContainer(): Container {
    const container = new Container();

    // Opt-in fake-repository mode: local dev without a running Supabase
    // instance, and the "component" test tier (real app/DI graph, no I/O).
    // Singleton scope: the in-memory fake only behaves like a persistent
    // store if the same instance backs every request in the process.
    const useFakeRepositories = process.env.USE_FAKE_REPOSITORIES === "true";
    container.bind<IBalancesRepository>(TYPES.IBalancesRepository)
        .to(useFakeRepositories ? InMemoryBalancesRepository : BalancesRepository)
        .inSingletonScope();

    container.bind<BalanceService>(TYPES.BalancesService).to(BalanceService);
    container.bind<BalancesController>(BalancesController).toSelf();

    return container;
}

// TSOA specifically looks for this export name to resolve controllers via DI
export const iocContainer = buildContainer();

