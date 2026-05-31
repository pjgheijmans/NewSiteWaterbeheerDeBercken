import { Request, Response, NextFunction } from 'express';

/**
 * Verifieer dat het verzoek bij een ingelogde gebruiker hoort.
 * Stuurt 401 JSON terug als er geen actieve sessie is.
 */
export function checkAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.session?.gebruiker) {
        res.status(401).json({ error: 'Niet ingelogd' });
        return;
    }
    next();
}

/** Controleer of de rol waterbeheerder of Administrator is. */
export function isAdminOrWaterbeheerder(taak: string): boolean {
    return taak === 'waterbeheerder' || taak === 'Administrator';
}

/** Controleer of de rol strikt waterbeheerder is. */
export function isWaterbeheerder(taak: string): boolean {
    return taak === 'waterbeheerder';
}

/** Controleer of de rol waterbeheerder of coordinator is. */
export function isWaterbeheerderOrCoordinator(taak: string): boolean {
    return taak === 'waterbeheerder' || taak === 'coordinator';
}
