import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { TrendRepository } from '../repositories/TrendRepository';
import { TrendController } from '../controllers/TrendController';

export function maakTrendRouter(pool: Pool): Router {
    const repo       = new TrendRepository(pool);
    const controller = new TrendController(repo);
    return controller.router;
}
