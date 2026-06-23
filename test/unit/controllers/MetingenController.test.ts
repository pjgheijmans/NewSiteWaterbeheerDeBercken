import request from 'supertest';
import { MetingenController } from '../../../backend/controllers/MetingenController';
import { IMetingenService } from '../../../backend/services/IMetingenService';
import { AppError } from '../../../backend/errors';
import { Meting, Actie } from '../../../backend/types';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IMetingenService> = {
    getMetingen: jest.fn(),
    saveMeting: jest.fn(),
    getActies: jest.fn(),
    resolveActie: jest.fn(),
    unresolveActie: jest.fn(),
    getBezoekers: jest.fn(),
    getGebondenChloor: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new MetingenController(mockService).router, taak);
}

const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('GET /metingen', () => {
    const metingen: Meting[] = [
        {
            bad_naam: 'Diep',
            ph_waarde: 7.2,
            chloor_waarde: 1.0,
            temperatuur: 28,
            flow: 300,
            filter_druk_in: 0.5,
            filter_druk_uit: 0.3,
            kathodische_bescherming: 1.2,
            water: null,
            chemicalien_chloor: null,
            chemicalien_zwavelzuur: null,
        },
    ];

    it('delegeert naar de service en geeft de metingen terug', async () => {
        mockService.getMetingen.mockResolvedValue(metingen);
        const res = await request(maakApp()).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body[0].bad_naam).toBe('Diep');
        expect(mockService.getMetingen).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 bij rol coordinator', async () => {
        const res = await request(maakApp('coordinator')).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockService.getMetingen).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        const res = await request(maakApp(null)).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(401);
    });

    it('geeft 500 als de service een fout gooit (via errorHandler)', async () => {
        mockService.getMetingen.mockRejectedValue(new Error('DB fout'));
        const res = await request(maakApp()).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB fout');
    });
});

describe('POST /metingen', () => {
    it('delegeert het opslaan naar de service (met auteur) en geeft de meta terug', async () => {
        mockService.saveMeting.mockResolvedValue({
            versie: 3,
            auteur: 'Test User',
            bijgewerkt_op: '2026-05-31T10:00:00',
        });
        const body = { datum: DATUM, bad_naam: 'Diep', ph_waarde: 7.2, versie: 2 };
        const res = await request(maakApp()).post('/metingen').send(body);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'success', versie: 3, auteur: 'Test User' });
        // (payload, auteur) — de auteur komt uit de sessie (maakTestGebruiker).
        expect(mockService.saveMeting).toHaveBeenCalledWith(
            expect.objectContaining({ bad_naam: 'Diep', versie: 2 }),
            'Test User',
        );
    });

    it('propageert een AppError 409 (conflict) met de juiste status', async () => {
        mockService.saveMeting.mockRejectedValue(
            new AppError('Iemand anders heeft deze gegevens ondertussen gewijzigd.', 409),
        );
        const res = await request(maakApp())
            .post('/metingen')
            .send({ datum: DATUM, bad_naam: 'Diep', versie: 1 });
        expect(res.status).toBe(409);
        expect(res.body.error).toContain('gewijzigd');
    });

    it('propageert een AppError 400 met de juiste status', async () => {
        mockService.saveMeting.mockRejectedValue(new AppError('Bad niet gevonden', 400));
        const res = await request(maakApp())
            .post('/metingen')
            .send({ datum: DATUM, bad_naam: 'Onbekend' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad niet gevonden');
    });

    it('geeft 403 bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator'))
            .post('/metingen')
            .send({ datum: DATUM, bad_naam: 'Diep' });
        expect(res.status).toBe(403);
        expect(mockService.saveMeting).not.toHaveBeenCalled();
    });
});

describe('GET /acties', () => {
    const acties: Actie[] = [
        {
            id: 1,
            bad_naam: 'Diep',
            beschrijving: 'Filter spoelen',
            actie_type: 'filter_spoelen_druk',
            opgelost: false,
            opgelost_op: null,
            opgelost_door: null,
        },
    ];

    it('delegeert met de opgegeven datum', async () => {
        mockService.getActies.mockResolvedValue(acties);
        const res = await request(maakApp()).get(`/acties?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(mockService.getActies).toHaveBeenCalledWith(DATUM);
    });

    it('valt terug op vandaag als datum ontbreekt', async () => {
        mockService.getActies.mockResolvedValue([]);
        await request(maakApp()).get('/acties');
        expect(mockService.getActies.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('POST /acties/:id/resolve', () => {
    it('geeft id en ingelogde gebruiker door aan de service', async () => {
        mockService.resolveActie.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/acties/42/resolve');
        expect(res.status).toBe(200);
        expect(mockService.resolveActie).toHaveBeenCalledWith(
            '42',
            expect.objectContaining({ taak: 'waterbeheerder' }),
        );
    });
});

describe('POST /acties/:id/unresolve', () => {
    it('delegeert het heropenen naar de service', async () => {
        mockService.unresolveActie.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/acties/7/unresolve');
        expect(res.status).toBe(200);
        expect(mockService.unresolveActie).toHaveBeenCalledWith('7');
    });
});

describe('GET /bezoekers', () => {
    it('geeft het bezoekers-resultaat van de service terug', async () => {
        mockService.getBezoekers.mockResolvedValue({
            bezoekers_vandaag: 120,
            bezoekers_totaal_diep: 800,
            bezoekers_totaal_ondiep: 600,
        });
        const res = await request(maakApp()).get(`/bezoekers?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            bezoekers_vandaag: 120,
            bezoekers_totaal_diep: 800,
            bezoekers_totaal_ondiep: 600,
        });
        expect(mockService.getBezoekers).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get(`/bezoekers?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });
});

describe('GET /gebonden-chloor', () => {
    it('geeft het gebonden-chloor-resultaat van de service terug', async () => {
        mockService.getGebondenChloor.mockResolvedValue({
            diep: 0.85,
            ondiep: 0.4,
            peuterbad: null,
        });
        const res = await request(maakApp()).get(`/gebonden-chloor?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ diep: 0.85, ondiep: 0.4, peuterbad: null });
        expect(mockService.getGebondenChloor).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get(`/gebonden-chloor?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });
});
