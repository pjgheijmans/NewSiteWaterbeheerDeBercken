import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { CoordinatorenRepository } from '../repositories/CoordinatorenRepository';
import { CoordinatorenLogboekRepository } from '../repositories/CoordinatorenLogboekRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { CoordinatorenController } from '../controllers/CoordinatorenController';

/**
 * Maakt de coordinatoren-router aan via dependency injection.
 */
export function maakCoordinatorenRouter(pool: Pool): Router {
    const coordRepo   = new CoordinatorenRepository(pool);
    const logboekRepo = new CoordinatorenLogboekRepository(pool);
    const actiesRepo  = new ActiesRepository(pool);
    const controller  = new CoordinatorenController(coordRepo, logboekRepo, actiesRepo);
    return controller.router;
}
