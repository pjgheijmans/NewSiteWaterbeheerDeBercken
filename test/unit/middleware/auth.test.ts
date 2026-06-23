import { Request, Response, NextFunction } from 'express';
import {
    checkAuth,
    vereist,
    heeftRecht,
    niveauVan,
    magHistorie,
    magDatumBewerken,
    vereistHistorieRecht,
    vandaagAmsterdam,
} from '../../../backend/middleware/auth';
import { Gebruiker } from '../../../backend/types';

function maakMocks(gebruiker: any = null) {
    const req = { session: { gebruiker } } as unknown as Request;
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
}

function gebruikerMet(rechten: Gebruiker['rechten'], magHistorieVlag = false): Gebruiker {
    return { id: 1, gebruikersnaam: 'tu', rechten, magHistorie: magHistorieVlag };
}

describe('checkAuth', () => {
    it('roept next() aan als gebruiker in sessie zit', () => {
        const { req, res, next } = maakMocks({ id: 1 });
        checkAuth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('geeft 401 terug als er geen sessie-gebruiker is', () => {
        const { req, res, next } = maakMocks(null);
        checkAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Niet ingelogd' });
        expect(next).not.toHaveBeenCalled();
    });

    it('geeft 401 terug bij ontbrekende sessie', () => {
        const req = {} as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;
        checkAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('niveauVan', () => {
    it('geeft het niveau van het domein terug', () => {
        expect(niveauVan(gebruikerMet({ waterbeheer: 'lezen' }), 'waterbeheer')).toBe('lezen');
    });
    it('geeft "geen" voor een ontbrekend domein of gebruiker', () => {
        expect(niveauVan(gebruikerMet({}), 'beheer')).toBe('geen');
        expect(niveauVan(undefined, 'beheer')).toBe('geen');
    });
});

describe('heeftRecht', () => {
    it.each([
        ['schrijven', 'lezen', true],
        ['schrijven', 'schrijven', true],
        ['lezen', 'lezen', true],
        ['lezen', 'schrijven', false],
        ['geen', 'lezen', false],
    ] as const)('niveau %s vs vereist %s → %s', (heeft, vereistNiveau, verwacht) => {
        expect(heeftRecht(gebruikerMet({ waterbeheer: heeft }), 'waterbeheer', vereistNiveau)).toBe(
            verwacht,
        );
    });
});

describe('vereist (middleware)', () => {
    it('roept next() aan als het recht voldoende is', () => {
        const mw = vereist('waterbeheer', 'schrijven');
        const { req, res, next } = maakMocks(gebruikerMet({ waterbeheer: 'schrijven' }));
        mw(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('geeft 403 als het niveau te laag is', () => {
        const mw = vereist('waterbeheer', 'schrijven');
        const { req, res, next } = maakMocks(gebruikerMet({ waterbeheer: 'lezen' }));
        mw(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Geen toegang' });
        expect(next).not.toHaveBeenCalled();
    });

    it('geeft 403 als het domein ontbreekt', () => {
        const mw = vereist('beheer', 'lezen');
        const { req, res, next } = maakMocks(gebruikerMet({ waterbeheer: 'schrijven' }));
        mw(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe('magHistorie', () => {
    it('reflecteert de vlag van de gebruiker', () => {
        expect(magHistorie(gebruikerMet({}, true))).toBe(true);
        expect(magHistorie(gebruikerMet({}, false))).toBe(false);
        expect(magHistorie(undefined)).toBe(false);
    });
});

describe('vandaagAmsterdam', () => {
    it('geeft een YYYY-MM-DD string', () => {
        expect(vandaagAmsterdam()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('magDatumBewerken', () => {
    const zonderHistorie = gebruikerMet({}, false);
    const metHistorie = gebruikerMet({}, true);

    it('staat vandaag toe, ongeacht historie-recht', () => {
        expect(magDatumBewerken(vandaagAmsterdam(), zonderHistorie)).toBe(true);
    });
    it('blokkeert het verleden zonder historie-recht', () => {
        expect(magDatumBewerken('2000-01-01', zonderHistorie)).toBe(false);
    });
    it('staat het verleden toe mét historie-recht', () => {
        expect(magDatumBewerken('2000-01-01', metHistorie)).toBe(true);
    });
});

describe('vereistHistorieRecht (middleware)', () => {
    function maakReqMocks(datum: string | undefined, magHistorieVlag: boolean) {
        const req = {
            body: { datum },
            query: {},
            session: { gebruiker: gebruikerMet({}, magHistorieVlag) },
        } as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;
        return { req, res, next };
    }

    it('laat vandaag door', () => {
        const { req, res, next } = maakReqMocks(vandaagAmsterdam(), false);
        vereistHistorieRecht(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('laat verzoeken zonder datum door', () => {
        const { req, res, next } = maakReqMocks(undefined, false);
        vereistHistorieRecht(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('blokkeert een datum in het verleden zonder historie-recht met 403', () => {
        const { req, res, next } = maakReqMocks('2000-01-01', false);
        vereistHistorieRecht(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('laat het verleden door mét historie-recht', () => {
        const { req, res, next } = maakReqMocks('2000-01-01', true);
        vereistHistorieRecht(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
