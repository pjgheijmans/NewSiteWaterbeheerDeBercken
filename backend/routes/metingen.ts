import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { MetingenRepository } from '../repositories/MetingenRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { ActieTekstenRepository } from '../repositories/ActieTekstenRepository';
import { CoordinatorenRepository } from '../repositories/CoordinatorenRepository';
import { MetingenService } from '../services/MetingenService';
import { MetingenController } from '../controllers/MetingenController';

/**
 * Maakt de metingen-router aan via dependency injection:
 * repositories → service → controller.
 */
export function maakMetingenRouter(pool: Pool): Router {
    const metingenRepo = new MetingenRepository(pool);
    const actiesRepo = new ActiesRepository(pool, new ActieTekstenRepository(pool));
    const coordRepo = new CoordinatorenRepository(pool);
    const service = new MetingenService(metingenRepo, actiesRepo, coordRepo);
    const controller = new MetingenController(service);
    return controller.router;
}
