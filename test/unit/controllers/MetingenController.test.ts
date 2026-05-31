import request from 'supertest';
import { MetingenController } from '../../../backend/controllers/MetingenController';
import { IMetingenRepository } from '../../../backend/repositories/IMetingenRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { IDaggegevensProvider } from '../../../backend/repositories/IDaggegevensProvider';
import { AppError } from '../../../backend/errors';
import { Meting, Actie } from '../../../backend/types';
import { maakTestApp } from '../../helpers/testApp';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMetingenRepo: jest.Mocked<IMetingenRepository> = {
    getMetingen:        jest.fn(),
    getBadId:           jest.fn(),
    savePeuterbadMeting:jest.fn(),
    saveGrootBadMeting: jest.fn(),
};

const mockActiesRepo: jest.Mocked<IActiesRepository> = {
    getActies:          jest.fn(),
    resolve:            jest.fn(),
    unresolve:          jest.fn(),
    genereer:           jest.fn(),
    genereerVerbruik:   jest.fn(),
    genereerBezoekers:  jest.fn(),
    genereerSpoelbeurt: jest.fn(),
};

const mockCoordRepo: jest.Mocked<IDaggegevensProvider> = {
    getDaggegevens: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new MetingenController(mockMetingenRepo, mockActiesRepo, mockCoordRepo);
    return maakTestApp(controller.router, taak);
}

const DATUM = '2026-05-31';

beforeEach(() => jest.clearAllMocks());

// ── GET /metingen ─────────────────────────────────────────────────────────────

describe('GET /metingen', () => {
    const metingen: Meting[] = [
        { bad_naam: 'Diep', ph_waarde: 7.2, chloor_waarde: 1.0, temperatuur: 28,
          flow: 300, filter_druk_in: 0.5, filter_druk_uit: 0.3,
          water: null, chemicalien_chloor: null, chemicalien_zwavelzuur: null },
    ];

    it('geeft metingen terug voor waterbeheerder', async () => {
        mockMetingenRepo.getMetingen.mockResolvedValue(metingen);

        const res = await request(maakApp()).get(`/metingen?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].bad_naam).toBe('Diep');
        expect(mockMetingenRepo.getMetingen).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 terug bij rol coordinator', async () => {
        const res = await request(maakApp('coordinator')).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockMetingenRepo.getMetingen).not.toHaveBeenCalled();
    });

    it('geeft 403 terug bij rol Administrator', async () => {
        const res = await request(maakApp('Administrator')).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get(`/metingen?datum=${DATUM}`);
        expect(res.status).toBe(401);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockMetingenRepo.getMetingen.mockRejectedValue(new Error('DB fout'));

        const res = await request(maakApp()).get(`/metingen?datum=${DATUM}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB fout');
    });
});

// ── POST /metingen ────────────────────────────────────────────────────────────

describe('POST /metingen', () => {
    it('slaat een grootbad meting op', async () => {
        mockMetingenRepo.getBadId.mockResolvedValue(1);
        mockMetingenRepo.saveGrootBadMeting.mockResolvedValue(undefined);
        mockActiesRepo.genereer.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/metingen').send({
            datum: DATUM, bad_naam: 'Diep', ph_waarde: 7.2, chloor_waarde: 1.0,
        });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockMetingenRepo.saveGrootBadMeting).toHaveBeenCalledWith(1,
            expect.objectContaining({ bad_naam: 'Diep', datum: DATUM }));
        expect(mockMetingenRepo.savePeuterbadMeting).not.toHaveBeenCalled();
    });

    it('slaat een peuterbad meting op', async () => {
        mockMetingenRepo.getBadId.mockResolvedValue(3);
        mockMetingenRepo.savePeuterbadMeting.mockResolvedValue(undefined);
        mockActiesRepo.genereer.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/metingen').send({
            datum: DATUM, bad_naam: 'Peuterbad', ph_waarde: 7.0,
        });

        expect(res.status).toBe(200);
        expect(mockMetingenRepo.savePeuterbadMeting).toHaveBeenCalledWith(3,
            expect.objectContaining({ bad_naam: 'Peuterbad' }));
        expect(mockMetingenRepo.saveGrootBadMeting).not.toHaveBeenCalled();
    });

    it('geeft 400 terug als bad niet bestaat (AppError)', async () => {
        mockMetingenRepo.getBadId.mockRejectedValue(new AppError('Bad niet gevonden', 400));

        const res = await request(maakApp()).post('/metingen').send({
            datum: DATUM, bad_naam: 'Onbekend',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad niet gevonden');
    });

    it('triggert actiegeneratie na opslaan', async () => {
        mockMetingenRepo.getBadId.mockResolvedValue(1);
        mockMetingenRepo.saveGrootBadMeting.mockResolvedValue(undefined);
        mockActiesRepo.genereer.mockResolvedValue(undefined);

        const payload = { datum: DATUM, bad_naam: 'Diep' };
        await request(maakApp()).post('/metingen').send(payload);

        expect(mockActiesRepo.genereer).toHaveBeenCalledWith(1, DATUM, 'Diep',
            expect.objectContaining({ bad_naam: 'Diep' }));
    });

    it('geeft 403 terug bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).post('/metingen').send({
            datum: DATUM, bad_naam: 'Diep',
        });
        expect(res.status).toBe(403);
        expect(mockMetingenRepo.getBadId).not.toHaveBeenCalled();
    });
});

// ── GET /acties ───────────────────────────────────────────────────────────────

describe('GET /acties', () => {
    const acties: Actie[] = [
        { id: 1, bad_naam: 'Diep', beschrijving: 'Filter spoelen', actie_type: 'filter_spoelen_druk',
          opgelost: false, opgelost_op: null, opgelost_door: null },
    ];

    it('geeft acties terug voor de opgegeven datum', async () => {
        mockActiesRepo.getActies.mockResolvedValue(acties);

        const res = await request(maakApp()).get(`/acties?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].actie_type).toBe('filter_spoelen_druk');
        expect(mockActiesRepo.getActies).toHaveBeenCalledWith(DATUM);
    });

    it('gebruikt vandaag als datum ontbreekt', async () => {
        mockActiesRepo.getActies.mockResolvedValue([]);

        await request(maakApp()).get('/acties');

        const [datumArg] = mockActiesRepo.getActies.mock.calls[0];
        expect(datumArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('geeft 403 terug bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get(`/acties?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });
});

// ── POST /acties/:id/resolve ──────────────────────────────────────────────────

describe('POST /acties/:id/resolve', () => {
    it('markeert een actie als opgelost', async () => {
        mockActiesRepo.resolve.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/acties/42/resolve');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockActiesRepo.resolve).toHaveBeenCalledWith('42', 'Test User');
    });
});

// ── POST /acties/:id/unresolve ────────────────────────────────────────────────

describe('POST /acties/:id/unresolve', () => {
    it('heropent een opgeloste actie', async () => {
        mockActiesRepo.unresolve.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/acties/7/unresolve');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockActiesRepo.unresolve).toHaveBeenCalledWith('7');
    });
});

// ── GET /bezoekers ────────────────────────────────────────────────────────────

describe('GET /bezoekers', () => {
    it('geeft bezoekersaantallen terug en triggert actiegeneratie', async () => {
        mockCoordRepo.getDaggegevens.mockResolvedValue({ bezoekers_vandaag: 120 });
        mockActiesRepo.genereerBezoekers.mockResolvedValue(undefined);
        mockActiesRepo.genereerSpoelbeurt.mockResolvedValue({ diep: 800, ondiep: 600 });

        const res = await request(maakApp()).get(`/bezoekers?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body.bezoekers_vandaag).toBe(120);
        expect(res.body.bezoekers_totaal_diep).toBe(800);
        expect(res.body.bezoekers_totaal_ondiep).toBe(600);
        expect(mockActiesRepo.genereerSpoelbeurt).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 terug bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get(`/bezoekers?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });
});
