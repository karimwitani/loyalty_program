import { Container } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";

import { IBalancesRepository, BalancesRepository } from "@/repositories/balances.repositorty";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import { BalanceService } from "@/services/balances.service";
import { BalancesController } from "@/controllers/balances.controller";

import { IOrganisationsRepository, OrganisationsRepository } from "@/repositories/organisations.repository";
import { InMemoryOrganisationsRepository } from "@/repositories/__fakes__/in-memory-organisations.repository";
import { OrganisationsService } from "@/services/organisations.service";
import { OrganisationsController } from "@/controllers/organisations.controller";


export function buildContainer(): Container {
    const container = new Container();

    // Opt-in fake-repository mode: local dev without a running Supabase
    // instance, and the "component" test tier (real app/DI graph, no I/O).
    // Singleton scope: the in-memory fake only behaves like a persistent
    // store if the same instance backs every request in the process.
    const useFakeRepositories = process.env.USE_FAKE_REPOSITORIES === "true";
    
    // Balances
    container.bind<IBalancesRepository>(TYPES.IBalancesRepository)
        .to(useFakeRepositories ? InMemoryBalancesRepository : BalancesRepository)
        .inSingletonScope();

    container.bind<BalanceService>(TYPES.BalancesService).to(BalanceService);
    container.bind<BalancesController>(BalancesController).toSelf();

    // Organisations
    container.bind<IOrganisationsRepository>(TYPES.IOrganisationsRepository)
        .to(useFakeRepositories ? InMemoryOrganisationsRepository : OrganisationsRepository)
        .inSingletonScope();

    container.bind<OrganisationsService>(TYPES.OrganisationsService).to(OrganisationsService);
    container.bind<OrganisationsController>(OrganisationsController).toSelf();

    return container;
}

// TSOA specifically looks for this export name to resolve controllers via DI
export const iocContainer = buildContainer();

