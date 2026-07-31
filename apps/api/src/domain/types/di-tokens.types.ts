export const TYPES = {
    // Balances
    IBalancesRepository: Symbol.for("IBalancesRepository"),
    IBalanceTransactionsRepository: Symbol.for("IBalanceTransactionsRepository"),
    BalancesService: Symbol.for("BalancesService"),
    
    // Orgs
    IOrganisationsRepository: Symbol.for("IOrganisationsRepository"),
    OrganisationsService: Symbol.for("OrganisationsService"),
    
    // Users
    IUsersRepository: Symbol.for("IUsersRepository"),
    UsersService: Symbol.for("UsersServices"),

    // Rewards
    IRewardsRepository: Symbol.for("IRewardsRepository"),
    RewardsService: Symbol.for("RewardsService"),

    // Reward programs
    IRewardProgramsRepository: Symbol.for("IRewardProgramsRepository"),
    RewardProgramsService: Symbol.for("RewardProgramsService"),
}