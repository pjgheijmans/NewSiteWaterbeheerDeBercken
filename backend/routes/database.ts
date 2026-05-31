import { Router } from 'express';
import { IDatabaseRepository } from '../repositories/IDatabaseRepository';
import { DatabaseController } from '../controllers/DatabaseController';

/**
 * DatabaseRepository wordt buiten de factory aangemaakt (in server.ts)
 * zodat runInitSql() bij het opstarten beschikbaar is.
 */
export function maakDatabaseRouter(repo: IDatabaseRepository): Router {
    const controller = new DatabaseController(repo);
    return controller.router;
}
