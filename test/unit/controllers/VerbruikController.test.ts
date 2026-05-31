import request from 'supertest';
import { VerbruikController } from '../../../backend/controllers/VerbruikController';
import { IVerbruikRepository } from '../../../backend/repositories/IVerbruikRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';
import { AppError } from '../../../backend/errors';
import { maakTestApp } from '../../helpers/testApp';

const mockVerbruikRepo: jest.Mocked<IVerbruikRepository> = {
    getVerbruik:       jest.fn(),
    getVorigeVerbruik: jest.fn(),
    saveVerbruik:      jest.fn(),
    getVerwarming:     jest.fn(),
    saveVerwarming:    jest.fn(),
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

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new VerbruikController(mockVerbruikRepo, mockActiesRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET /diep-ondiep', () => {
    it('geeft verbruikdata terug voor waterbeheerder', async () => {
        mockVerbruikRepo.getVerbruik.mockResolvedValue({ datum: '2026-05-31', water_diep: 1000 });

        const res = await request(maakApp()).get('/diep-ondiep?datum=2026-05-31');

        expect(res.status).toBe(200);
        expect(res.body.water_diep).toBe(1000);
        expect(mockVerbruikRepo.getVerbruik).toHaveBeenCalledWith('2026-05-31');
    });

    it('geeft 403 terug bij verkeerde rol', async () => {
        const res = await request(maakApp('coordinator')).get('/diep-ondiep?datum=2026-05-31');
        expect(res.status).toBe(403);
        expect(mockVerbruikRepo.getVerbruik).not.toHaveBeenCalled();
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/diep-ondiep?datum=2026-05-31');
        expect(res.status).toBe(401);
    });
});

describe('POST /diep-ondiep', () => {
    const payload = { datum: '2026-05-31', water_diep: 1000, gas: 50 };

    it('slaat verbruik op en triggert actiegeneratie', async () => {
        mockVerbruikRepo.saveVerbruik.mockResolvedValue(undefined);
        mockActiesRepo.genereerVerbruik.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/diep-ondiep').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockVerbruikRepo.saveVerbruik).toHaveBeenCalledWith(payload);
        expect(mockActiesRepo.genereerVerbruik).toHaveBeenCalledWith('2026-05-31', payload);
    });

    it('geeft 403 terug bij verkeerde rol', async () => {
        const res = await request(maakApp('Administrator')).post('/diep-ondiep').send(payload);
        expect(res.status).toBe(403);
        expect(mockVerbruikRepo.saveVerbruik).not.toHaveBeenCalled();
    });
});

describe('GET /verwarmingssysteem', () => {
    it('geeft verwarmingsdata terug', async () => {
        mockVerbruikRepo.getVerwarming.mockResolvedValue({ datum: '2026-05-31', verwarming_status_1: 1 });

        const res = await request(maakApp()).get('/verwarmingssysteem?datum=2026-05-31');

        expect(res.status).toBe(200);
        expect(res.body.verwarming_status_1).toBe(1);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockVerbruikRepo.getVerwarming.mockRejectedValue(new Error('Verbinding verbroken'));

        const res = await request(maakApp()).get('/verwarmingssysteem?datum=2026-05-31');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Verbinding verbroken');
    });
});

describe('POST /verwarmingssysteem', () => {
    it('slaat verwarmingsstatus op', async () => {
        mockVerbruikRepo.saveVerwarming.mockResolvedValue(undefined);
        const payload = { datum: '2026-05-31', verwarming_status_1: true };

        const res = await request(maakApp()).post('/verwarmingssysteem').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockVerbruikRepo.saveVerwarming).toHaveBeenCalledWith(payload);
    });
});
