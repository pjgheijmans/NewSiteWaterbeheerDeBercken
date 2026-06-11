import { Router, Request, Response } from 'express';
import { bepaalVersie } from '../versie';

/**
 * Publieke versie-endpoint: geeft de code-versie en git-commit terug.
 * Geen authenticatie nodig — de versie is geen gevoelige informatie en de
 * frontend toont hem in de kop nog vóór het inloggen.
 */
export function maakVersieRouter(): Router {
    const router = Router();
    router.get('/', (_req: Request, res: Response) => {
        res.json(bepaalVersie());
    });
    return router;
}
