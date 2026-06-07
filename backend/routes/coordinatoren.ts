import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { CoordinatorenRepository } from '../repositories/CoordinatorenRepository';
import { CoordinatorenLogboekRepository } from '../repositories/CoordinatorenLogboekRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { ActieTekstenRepository } from '../repositories/ActieTekstenRepository';
import { CoordinatorenService } from '../services/CoordinatorenService';
import { CoordinatorenController } from '../controllers/CoordinatorenController';

/**
 * Maakt de coordinatoren-router aan via dependency injection:
 * repositories → service → controller.
 */
export function maakCoordinatorenRouter(pool: Pool): Router {
    const coordRepo   = new CoordinatorenRepository(pool);
    const logboekRepo = new CoordinatorenLogboekRepository(pool);
    const actiesRepo  = new ActiesRepository(pool, new ActieTekstenRepository(pool));
    const service     = new CoordinatorenService(coordRepo, logboekRepo, actiesRepo);
    const controller  = new CoordinatorenController(service);
    return controller.router;
}
