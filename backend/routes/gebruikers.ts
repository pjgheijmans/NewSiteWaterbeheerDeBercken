import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../repositories/GebruikersRepository';
import { GebruikersService } from '../services/GebruikersService';
import { GebruikersController } from '../controllers/GebruikersController';

export function maakGebruikersRouter(pool: Pool): Router {
    const repo       = new GebruikersRepository(pool);
    const service    = new GebruikersService(repo);
    const controller = new GebruikersController(service);
    return controller.router;
}
