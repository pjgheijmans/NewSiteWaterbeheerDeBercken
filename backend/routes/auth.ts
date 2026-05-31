import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../repositories/GebruikersRepository';
import { AuthController } from '../controllers/AuthController';

export function maakAuthRouter(pool: Pool): Router {
    const gebruikersRepo = new GebruikersRepository(pool);
    const controller     = new AuthController(gebruikersRepo);
    return controller.router;
}
