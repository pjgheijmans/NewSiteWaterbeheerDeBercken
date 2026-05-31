import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../repositories/GebruikersRepository';
import { GebruikersController } from '../controllers/GebruikersController';

export function maakGebruikersRouter(pool: Pool): Router {
    const repo       = new GebruikersRepository(pool);
    const controller = new GebruikersController(repo);
    return controller.router;
}
