import express, { Application, RequestHandler, Router } from 'express';
import { Gebruiker, RolRechten } from '../../backend/types';
import { errorHandler } from '../../backend/middleware/errorHandler';

/**
 * De rechten + historie-toestemming die bij een legacy-rolnaam horen.
 * Spiegelt de standaardrollen uit init.sql, zodat bestaande tests die een
 * rolnaam ('waterbeheerder'/'coordinator'/'Administrator') meegeven blijven werken.
 */
function rechtenVoorTaak(taak: string): { rechten: RolRechten; magHistorie: boolean } {
    switch (taak) {
        case 'Administrator':
            return { rechten: { beheer: 'schrijven' }, magHistorie: true };
        case 'waterbeheerder':
            return {
                rechten: { waterbeheer: 'schrijven', coordinator: 'schrijven' },
                magHistorie: true,
            };
        case 'coordinator':
            return { rechten: { coordinator: 'schrijven' }, magHistorie: false };
        default:
            return { rechten: {}, magHistorie: false };
    }
}

/** Standaard testgebruiker voor sessie-mocks. */
export function maakTestGebruiker(taak = 'waterbeheerder'): Gebruiker {
    const { rechten, magHistorie } = rechtenVoorTaak(taak);
    return {
        id: 1,
        gebruikersnaam: 'testuser',
        taak,
        voornaam: 'Test',
        achternaam: 'User',
        inlognaam: 'testuser',
        rechten,
        magHistorie,
    };
}

/**
 * Middleware die een nep-sessie injecteert zonder express-session.
 * @param gebruiker - null betekent geen ingelogde gebruiker (401-scenario's)
 */
export function maakSessieMiddleware(gebruiker: Gebruiker | null): RequestHandler {
    return (req, _res, next) => {
        (req as any).session = {
            gebruiker: gebruiker ?? undefined,
            destroy: jest.fn((cb?: () => void) => {
                if (cb) cb();
            }),
        };
        next();
    };
}

/**
 * Bouw een minimale Express-testapp met ingebakken sessie-mock.
 * @param router - De router van de controller die getest wordt.
 * @param taak   - Rol van de nep-gebruiker; null = niet ingelogd.
 */
export function maakTestApp(router: Router, taak: string | null = 'waterbeheerder'): Application {
    const app = express();
    app.use(express.json());
    app.use(maakSessieMiddleware(taak !== null ? maakTestGebruiker(taak) : null));
    app.use('/', router);
    app.use(errorHandler);
    return app;
}
