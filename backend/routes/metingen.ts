import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { MetingenRepository } from '../repositories/MetingenRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { CoordinatorenRepository } from '../repositories/CoordinatorenRepository';
import { MetingenController } from '../controllers/MetingenController';

/**
 * Maakt de metingen-router aan via dependency injection.
 */
export function maakMetingenRouter(pool: Pool): Router {
    const metingenRepo = new MetingenRepository(pool);
    const actiesRepo   = new ActiesRepository(pool);
    const coordRepo    = new CoordinatorenRepository(pool);
    const controller   = new MetingenController(metingenRepo, actiesRepo, coordRepo);
    return controller.router;
}
