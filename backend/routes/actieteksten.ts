import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { ActieTekstenRepository } from '../repositories/ActieTekstenRepository';
import { ActieTekstenService } from '../services/ActieTekstenService';
import { ActieTekstenController } from '../controllers/ActieTekstenController';

export function maakActieTekstenRouter(pool: Pool): Router {
    const repo       = new ActieTekstenRepository(pool);
    const service    = new ActieTekstenService(repo);
    const controller = new ActieTekstenController(service);
    return controller.router;
}
