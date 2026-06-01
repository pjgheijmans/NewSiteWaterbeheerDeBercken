import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { LimietenRepository } from '../repositories/LimietenRepository';
import { LimietenService } from '../services/LimietenService';
import { LimietenController } from '../controllers/LimietenController';

export function maakLimietenRouter(pool: Pool): Router {
    const repo       = new LimietenRepository(pool);
    const service    = new LimietenService(repo);
    const controller = new LimietenController(service);
    return controller.router;
}
