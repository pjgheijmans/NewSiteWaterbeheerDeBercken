import { Request, Response, NextFunction } from 'express';
import { Domein, Rechtniveau, Gebruiker } from '../types';

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

/** Niveaus oplopend in macht; gebruikt om te vergelijken. */
const RANG: Record<Rechtniveau, number> = { geen: 0, lezen: 1, schrijven: 2 };

/** Het effectieve niveau van een gebruiker binnen een domein (ontbrekend telt als 'geen'). */
export function niveauVan(gebruiker: Gebruiker | undefined, domein: Domein): Rechtniveau {
    return gebruiker?.rechten?.[domein] ?? 'geen';
}

/** True als de gebruiker minstens `vereistNiveau` heeft in `domein`. */
export function heeftRecht(gebruiker: Gebruiker | undefined, domein: Domein, vereistNiveau: Rechtniveau): boolean {
    return RANG[niveauVan(gebruiker, domein)] >= RANG[vereistNiveau];
}

/**
 * Middleware-fabriek: eist minstens `niveau` in `domein`.
 * Veronderstelt dat checkAuth ervoor in de keten zit (sessie aanwezig);
 * stuurt 403 als het recht ontbreekt.
 */
export function vereist(domein: Domein, niveau: 'lezen' | 'schrijven') {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!heeftRecht(req.session?.gebruiker, domein, niveau)) {
            res.status(403).json({ error: 'Geen toegang' });
            return;
        }
        next();
    };
}

/** True als de gebruiker datums in het verleden mag bewerken (historie). */
export function magHistorie(gebruiker: Gebruiker | undefined): boolean {
    return !!gebruiker?.magHistorie;
}

/**
 * Huidige kalenderdag in Europe/Amsterdam als YYYY-MM-DD.
 * Dit is de grens voor de historie-regel: alles t/m vandaag is "vandaag",
 * eerdere datums vereisen het historie-recht.
 */
export function vandaagAmsterdam(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Amsterdam',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
}

/**
 * Mag deze gebruiker de gegeven datum bewerken? Vandaag (en de toekomst) mag
 * altijd; een datum in het verleden alleen met het historie-recht.
 * YYYY-MM-DD vergelijkt lexicografisch gelijk aan chronologisch.
 */
export function magDatumBewerken(datum: string, gebruiker: Gebruiker | undefined): boolean {
    return datum >= vandaagAmsterdam() || magHistorie(gebruiker);
}

/**
 * Middleware: blokkeert het bewerken van een datum in het verleden zonder
 * historie-recht. Leest de datum uit de body (POST) of de querystring (DELETE).
 * Hoort ná valideerBody te draaien zodat de datum al gevalideerd is; verzoeken
 * zonder datum laat hij ongemoeid door.
 */
export function vereistHistorieRecht(req: Request, res: Response, next: NextFunction): void {
    const datum = (req.body?.datum ?? req.query?.datum) as string | undefined;
    if (!datum || magDatumBewerken(datum, req.session?.gebruiker)) {
        next();
        return;
    }
    res.status(403).json({ error: 'Een datum in het verleden mag je niet bewerken' });
}
