import request from 'supertest';
import { CoordinatorenController } from '../../../backend/controllers/CoordinatorenController';
import { ICoordinatorenRepository } from '../../../backend/repositories/ICoordinatorenRepository';
import { ICoordinatorenLogboekRepository } from '../../../backend/repositories/ICoordinatorenLogboekRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { AppError } from '../../../backend/errors';
import { maakTestApp } from '../../helpers/testApp';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCoordRepo: jest.Mocked<ICoordinatorenRepository> = {
    getCoordinatoren: jest.fn(),
    getBadId:         jest.fn(),
    saveMeting:       jest.fn(),
    deleteBlok:       jest.fn(),
    getChecklist:     jest.fn(),
    saveChecklist:    jest.fn(),
    getDaggegevens:   jest.fn(),
    saveDaggegevens:  jest.fn(),
};

const mockLogboekRepo: jest.Mocked<ICoordinatorenLogboekRepository> = {
    getByDatum: jest.fn(),
    save:       jest.fn(),
    deleteById: jest.fn(),
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

function maakApp(taak: string | null = 'coordinator') {
    const controller = new CoordinatorenController(mockCoordRepo, mockLogboekRepo, mockActiesRepo);
    return maakTestApp(controller.router, taak);
}

const DATUM = '2026-05-31';

beforeEach(() => jest.clearAllMocks());

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /', () => {
    it('geeft coordinator-blokken terug voor coordinator', async () => {
        mockCoordRepo.getCoordinatoren.mockResolvedValue([]);

        const res = await request(maakApp('coordinator')).get(`/?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(mockCoordRepo.getCoordinatoren).toHaveBeenCalledWith(DATUM);
    });

    it('geeft coordinator-blokken terug voor waterbeheerder', async () => {
        mockCoordRepo.getCoordinatoren.mockResolvedValue([]);

        const res = await request(maakApp('waterbeheerder')).get(`/?datum=${DATUM}`);

        expect(res.status).toBe(200);
    });

    it('geeft 403 terug voor Administrator', async () => {
        const res = await request(maakApp('Administrator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockCoordRepo.getCoordinatoren).not.toHaveBeenCalled();
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(401);
    });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /', () => {
    const payload = { datum: DATUM, bad_naam: 'Diep', tijdstip: '10:00:00', ph_waarde: 7.2 };

    it('slaat een meting op met berekende auteur', async () => {
        mockCoordRepo.getBadId.mockResolvedValue(1);
        mockCoordRepo.saveMeting.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        // auteur = 'Test User' (voornaam + achternaam van testgebruiker)
        expect(mockCoordRepo.saveMeting).toHaveBeenCalledWith(1, expect.anything(), 'Test User');
    });

    it('geeft 400 terug als bad niet bestaat', async () => {
        mockCoordRepo.getBadId.mockRejectedValue(new AppError('Bad niet gevonden', 400));

        const res = await request(maakApp()).post('/').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad niet gevonden');
    });
});

// ── GET /checklist ────────────────────────────────────────────────────────────

describe('GET /checklist', () => {
    it('geeft checklistdata terug', async () => {
        mockCoordRepo.getChecklist.mockResolvedValue({
            proef_waterspeel: 1, proef_spraypark: 0, proef_douches: 1, proef_glijbaan: 0,
        });

        const res = await request(maakApp()).get(`/checklist?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body.proef_waterspeel).toBe(1);
        expect(mockCoordRepo.getChecklist).toHaveBeenCalledWith(DATUM);
    });
});

// ── POST /checklist ───────────────────────────────────────────────────────────

describe('POST /checklist', () => {
    it('slaat de checklist op', async () => {
        mockCoordRepo.saveChecklist.mockResolvedValue(undefined);
        const payload = { datum: DATUM, proef_waterspeel: 1, proef_spraypark: 0, proef_douches: 1, proef_glijbaan: 0 };

        const res = await request(maakApp()).post('/checklist').send(payload);

        expect(res.status).toBe(200);
        expect(mockCoordRepo.saveChecklist).toHaveBeenCalledWith(DATUM, payload);
    });
});

// ── GET /daggegevens ──────────────────────────────────────────────────────────

describe('GET /daggegevens', () => {
    it('geeft daggegevens terug', async () => {
        mockCoordRepo.getDaggegevens.mockResolvedValue({ bezoekers_vandaag: 80, lucht_temperatuur: 22 });

        const res = await request(maakApp()).get(`/daggegevens?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body.bezoekers_vandaag).toBe(80);
    });
});

// ── POST /daggegevens ─────────────────────────────────────────────────────────

describe('POST /daggegevens', () => {
    it('slaat daggegevens op en triggert actiegeneratie (fire-and-forget)', async () => {
        mockCoordRepo.saveDaggegevens.mockResolvedValue(undefined);
        mockActiesRepo.genereerBezoekers.mockResolvedValue(undefined);
        mockActiesRepo.genereerSpoelbeurt.mockResolvedValue({ diep: 500, ondiep: 300 });

        const payload = { datum: DATUM, bezoekers_vandaag: 80, lucht_temperatuur: 22 };
        const res = await request(maakApp()).post('/daggegevens').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockCoordRepo.saveDaggegevens).toHaveBeenCalledWith(DATUM, payload);
    });
});

// ── DELETE / ──────────────────────────────────────────────────────────────────

describe('DELETE /', () => {
    it('verwijdert een blok bij geldige datum en tijdstip', async () => {
        mockCoordRepo.deleteBlok.mockResolvedValue(undefined);

        const res = await request(maakApp())
            .delete(`/?datum=${DATUM}&tijdstip=10%3A00%3A00`);

        expect(res.status).toBe(200);
        expect(mockCoordRepo.deleteBlok).toHaveBeenCalledWith(DATUM, '10:00:00');
    });

    it('geeft 400 terug als datum of tijdstip ontbreekt', async () => {
        const res = await request(maakApp()).delete(`/?datum=${DATUM}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/verplicht/i);
        expect(mockCoordRepo.deleteBlok).not.toHaveBeenCalled();
    });
});

// ── GET /logboek ──────────────────────────────────────────────────────────────

describe('GET /logboek', () => {
    it('geeft logboekregels terug', async () => {
        mockLogboekRepo.getByDatum.mockResolvedValue([
            { id: 1, tijdstip: '10:00:00', auteur: 'Test User', tekst: 'Test' },
        ]);

        const res = await request(maakApp()).get(`/logboek?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(mockLogboekRepo.getByDatum).toHaveBeenCalledWith(DATUM);
    });
});

// ── POST /logboek ─────────────────────────────────────────────────────────────

describe('POST /logboek', () => {
    it('slaat een logboekregel op en geeft id en auteur terug', async () => {
        mockLogboekRepo.save.mockResolvedValue({ id: 5, auteur: 'Test User' });

        const res = await request(maakApp()).post('/logboek').send({
            datum: DATUM, tijdstip: '10:00:00', tekst: 'Aantekening',
        });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(5);
        expect(res.body.auteur).toBe('Test User');
    });
});

// ── DELETE /logboek/:id ───────────────────────────────────────────────────────

describe('DELETE /logboek/:id', () => {
    it('verwijdert een logboekregel op id', async () => {
        mockLogboekRepo.deleteById.mockResolvedValue(undefined);

        const res = await request(maakApp()).delete('/logboek/3');

        expect(res.status).toBe(200);
        expect(mockLogboekRepo.deleteById).toHaveBeenCalledWith('3');
    });
});
