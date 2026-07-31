import { Container } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";

// Balances
import { IBalancesRepository, BalancesRepository } from "@/repositories/balances.repositorty";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import { IBalanceTransactionsRepository, BalanceTransactionsRepository } from "@/repositories/balance_transactions.repository";
import { InMemoryBalanceTransactionsRepository } from "@/repositories/__fakes__/in-memory-balance-transactions.repository";
import { BalanceService } from "@/services/balances.service";
import { BalancesController } from "@/controllers/balances.controller";

// Orgs
import { IOrganisationsRepository, OrganisationsRepository } from "@/repositories/organisations.repository";
import { InMemoryOrganisationsRepository } from "@/repositories/__fakes__/in-memory-organisations.repository";
import { OrganisationsService } from "@/services/organisations.service";
import { OrganisationsController } from "@/controllers/organisations.controller";

// Users
import { IUsersRepository, UsersRepository } from "@/repositories/users.repository";
import { InMemoryUsersRepository } from "@/repositories/__fakes__/in-memory-users.repository";
import { UsersService } from "@/services/users.service";
import { UsersController } from "@/controllers/users.controller";

// Rewards
import { IRewardsRepository, RewardsRepository } from "@/repositories/rewards.repository";
import { InMemoryRewardsRepository } from "@/repositories/__fakes__/in-memory-rewards.repository";
import { RewardsService } from "@/services/rewards.service";
import { RewardsController } from "@/controllers/rewards.controller";

// Reward programs
import { IRewardProgramsRepository, RewardProgramsRepository } from "@/repositories/reward_programs.repository";
import { InMemoryRewardProgramsRepository } from "@/repositories/__fakes__/in-memory-reward-programs.repository";
import { RewardProgramsService } from "@/services/reward_programs.service";
import { RewardProgramsController } from "@/controllers/reward_programs.controller";

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

    container.bind<IBalanceTransactionsRepository>(TYPES.IBalanceTransactionsRepository)
        .to(useFakeRepositories ? InMemoryBalanceTransactionsRepository : BalanceTransactionsRepository)
        .inSingletonScope();

    container.bind<BalanceService>(TYPES.BalancesService).to(BalanceService);
    container.bind<BalancesController>(BalancesController).toSelf();

    // Organisations
    container.bind<IOrganisationsRepository>(TYPES.IOrganisationsRepository)
        .to(useFakeRepositories ? InMemoryOrganisationsRepository : OrganisationsRepository)
        .inSingletonScope();

    container.bind<OrganisationsService>(TYPES.OrganisationsService).to(OrganisationsService);
    container.bind<OrganisationsController>(OrganisationsController).toSelf();

    // Users
    container.bind<IUsersRepository>(TYPES.IUsersRepository)
        .to(useFakeRepositories ? InMemoryUsersRepository : UsersRepository)
        .inSingletonScope();

    container.bind<UsersService>(TYPES.UsersService).to(UsersService);
    container.bind<UsersController>(UsersController).toSelf();

    // Rewards
    container.bind<IRewardsRepository>(TYPES.IRewardsRepository)
        .to(useFakeRepositories ? InMemoryRewardsRepository : RewardsRepository)
        .inSingletonScope();

    container.bind<RewardsService>(TYPES.RewardsService).to(RewardsService);
    container.bind<RewardsController>(RewardsController).toSelf();

    // Reward programs
    // InMemoryRewardProgramsRepository depends on IRewardsRepository (shared
    // singleton, bound above) so an inline-created reward is visible via
    // GET /rewards too - see the fake's own comment for why.
    container.bind<IRewardProgramsRepository>(TYPES.IRewardProgramsRepository)
        .to(useFakeRepositories ? InMemoryRewardProgramsRepository : RewardProgramsRepository)
        .inSingletonScope();

    container.bind<RewardProgramsService>(TYPES.RewardProgramsService).to(RewardProgramsService);
    container.bind<RewardProgramsController>(RewardProgramsController).toSelf();


    return container;
}

// TSOA specifically looks for this export name to resolve controllers via DI
export const iocContainer = buildContainer();

