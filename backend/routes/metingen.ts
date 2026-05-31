import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { MetingenRepository } from '../repositories/MetingenRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { MetingenController } from '../controllers/MetingenController';
import { IDaggegevensProvider } from '../repositories/IDaggegevensProvider';

/**
 * Maakt de metingen-router aan via dependency injection.
 * De coordinatoren-repository is nog niet omgezet en wordt als IDaggegevensProvider geladen.
 */
export function maakMetingenRouter(pool: Pool): Router {
    const metingenRepo = new MetingenRepository(pool);
    const actiesRepo   = new ActiesRepository(pool);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const coordRepo    = require('../repositories/coordinatoren') as IDaggegevensProvider;
    const controller   = new MetingenController(metingenRepo, actiesRepo, coordRepo);
    return controller.router;
}
