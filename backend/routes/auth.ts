import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../repositories/GebruikersRepository';
import { AuthService } from '../services/AuthService';
import { AuthController } from '../controllers/AuthController';

export function maakAuthRouter(pool: Pool): Router {
    const gebruikersRepo = new GebruikersRepository(pool);
    const service        = new AuthService(gebruikersRepo);
    const controller     = new AuthController(service);
    return controller.router;
}
