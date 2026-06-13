import { Router } from 'express';
import { IConfiguratieService } from '../services/IConfiguratieService';
import { ConfiguratieController } from '../controllers/ConfiguratieController';

/**
 * Neemt de gedeelde ConfiguratieService (niet de pool), zodat de admin-wijziging
 * dezelfde cache ververst die de sessie-middleware per request leest.
 */
export function maakConfiguratieRouter(service: IConfiguratieService): Router {
    return new ConfiguratieController(service).router;
}
