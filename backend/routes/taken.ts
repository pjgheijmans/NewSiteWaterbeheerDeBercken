import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { RondetakenRepository } from '../repositories/RondetakenRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { ActieTekstenRepository } from '../repositories/ActieTekstenRepository';
import { TakenService } from '../services/TakenService';
import { TakenController } from '../controllers/TakenController';

/**
 * Maakt de taken-router aan via dependency injection. De TakenService stelt
 * de unieke weergave samen uit de rondetaken- en acties-repository (read-only).
 */
export function maakTakenRouter(pool: Pool): Router {
    const rondetakenRepo = new RondetakenRepository(pool);
    const actiesRepo = new ActiesRepository(pool, new ActieTekstenRepository(pool));
    const service = new TakenService(rondetakenRepo, actiesRepo);
    const controller = new TakenController(service);
    return controller.router;
}
