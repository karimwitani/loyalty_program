import { Container } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";



import { IBalancesRepository, BalancesRepository } from "@/repositories/balances.repositorty";
import { BalanceService } from "@/services/balances.service";
import { BalancesController } from "@/controllers/balances.controller";

const container = new Container();

container.bind<IBalancesRepository>(TYPES.IBalancesRepository).to(BalancesRepository);
container.bind<BalanceService>(TYPES.BalancesService).to(BalanceService);
container.bind<BalancesController>(BalancesController).toSelf();


// TSOA specifically looks for this export name to resolve controllers via DI
export const iocContainer = container;

