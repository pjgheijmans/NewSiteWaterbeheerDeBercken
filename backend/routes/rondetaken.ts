import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { RondetakenRepository } from '../repositories/RondetakenRepository';
import { ActiesRepository } from '../repositories/ActiesRepository';
import { ActieTekstenRepository } from '../repositories/ActieTekstenRepository';
import { RondetakenService } from '../services/RondetakenService';
import { RondetakenController } from '../controllers/RondetakenController';

/**
 * Maakt de rondetaken-router aan via dependency injection:
 * repository → service → controller. De ActiesRepository wordt meegegeven
 * voor de tweerichtingskoppeling tussen filter-rondetaken en filter_spoelen-acties.
 */
export function maakRondetakenRouter(pool: Pool): Router {
    const repo       = new RondetakenRepository(pool);
    const actiesRepo = new ActiesRepository(pool, new ActieTekstenRepository(pool));
    const service    = new RondetakenService(repo, actiesRepo);
    const controller = new RondetakenController(service);
    return controller.router;
}
