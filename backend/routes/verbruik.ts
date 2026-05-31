import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { VerbruikRepository } from '../repositories/VerbruikRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { VerbruikController } from '../controllers/VerbruikController';

/**
 * Maakt de verbruik-router aan via dependency injection.
 */
export function maakVerbruikRouter(pool: Pool): Router {
    const verbruikRepo = new VerbruikRepository(pool);
    const actiesRepo   = new ActiesRepository(pool);
    const controller   = new VerbruikController(verbruikRepo, actiesRepo);
    return controller.router;
}
