import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { RollenRepository } from '../repositories/RollenRepository';
import { RollenController } from '../controllers/RollenController';

export function maakRollenRouter(pool: Pool): Router {
    const repo       = new RollenRepository(pool);
    const controller = new RollenController(repo);
    return controller.router;
}
