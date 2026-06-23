import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { TrendRepository } from '../repositories/TrendRepository';
import { TrendService } from '../services/TrendService';
import { TrendController } from '../controllers/TrendController';

export function maakTrendRouter(pool: Pool): Router {
    const repo = new TrendRepository(pool);
    const service = new TrendService(repo);
    const controller = new TrendController(service);
    return controller.router;
}
