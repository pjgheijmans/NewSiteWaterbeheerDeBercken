import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { LogboekRepository } from '../repositories/LogboekRepository';
import { LogboekController } from '../controllers/LogboekController';

export function maakLogboekRouter(pool: Pool): Router {
    const repo       = new LogboekRepository(pool);
    const controller = new LogboekController(repo);
    return controller.router;
}
