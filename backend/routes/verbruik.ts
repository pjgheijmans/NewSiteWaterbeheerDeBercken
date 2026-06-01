import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { VerbruikRepository } from '../repositories/VerbruikRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { VerbruikService } from '../services/VerbruikService';
import { VerbruikController } from '../controllers/VerbruikController';

/**
 * Maakt de verbruik-router aan via dependency injection:
 * repositories → service → controller.
 */
export function maakVerbruikRouter(pool: Pool): Router {
    const verbruikRepo = new VerbruikRepository(pool);
    const actiesRepo   = new ActiesRepository(pool);
    const service      = new VerbruikService(verbruikRepo, actiesRepo);
    const controller   = new VerbruikController(service);
    return controller.router;
}
