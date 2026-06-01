import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { LogboekRepository } from '../repositories/LogboekRepository';
import { LogboekService } from '../services/LogboekService';
import { LogboekController } from '../controllers/LogboekController';

export function maakLogboekRouter(pool: Pool): Router {
    const repo       = new LogboekRepository(pool);
    const service    = new LogboekService(repo);
    const controller = new LogboekController(service);
    return controller.router;
}
