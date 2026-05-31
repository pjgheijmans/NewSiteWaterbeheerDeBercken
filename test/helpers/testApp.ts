import express, { Application, RequestHandler, Router } from 'express';
import { Gebruiker } from '../../backend/types';

/** Standaard testgebruiker voor sessie-mocks. */
export function maakTestGebruiker(taak = 'waterbeheerder'): Gebruiker {
    return {
        id: 1,
        gebruikersnaam: 'testuser',
        taak,
        voornaam: 'Test',
        achternaam: 'User',
        inlognaam: 'testuser',
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
            destroy: jest.fn((cb?: () => void) => { if (cb) cb(); }),
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
    return app;
}
