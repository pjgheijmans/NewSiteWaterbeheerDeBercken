import { Router } from 'express';
import { IDatabaseRepository } from '../repositories/IDatabaseRepository';
import { DatabaseService } from '../services/DatabaseService';
import { DatabaseController } from '../controllers/DatabaseController';

/**
 * DatabaseRepository wordt buiten de factory aangemaakt (in server.ts)
 * zodat runInitSql() bij het opstarten beschikbaar is. Hier wordt de
 * service eromheen gebouwd en aan de controller gegeven.
 */
export function maakDatabaseRouter(repo: IDatabaseRepository): Router {
    const service = new DatabaseService(repo);
    const controller = new DatabaseController(service);
    return controller.router;
}
