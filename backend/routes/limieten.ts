import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { LimietenRepository } from '../repositories/LimietenRepository';
import { LimietenController } from '../controllers/LimietenController';

export function maakLimietenRouter(pool: Pool): Router {
    const repo       = new LimietenRepository(pool);
    const controller = new LimietenController(repo);
    return controller.router;
}
