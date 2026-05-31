import request from 'supertest';
import { LimietenController } from '../../../backend/controllers/LimietenController';
import { ILimietenRepository } from '../../../backend/repositories/ILimietenRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<ILimietenRepository> = {
    getAll:       jest.fn(),
    getDefaults:  jest.fn(),
    seedDefaults: jest.fn(),
    save:         jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new LimietenController(mockRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

// ── GET / — geen auth vereist ─────────────────────────────────────────────────

describe('GET /', () => {
    it('geeft limietenmap terug zonder authenticatie', async () => {
        mockRepo.getAll.mockResolvedValue({ ph_waarde: { min: 6.8, max: 7.6 } });

        const res = await request(maakApp(null)).get('/');

        expect(res.status).toBe(200);
        expect(res.body.ph_waarde).toEqual({ min: 6.8, max: 7.6 });
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockRepo.getAll.mockRejectedValue(new Error('DB fout'));

        const res = await request(maakApp(null)).get('/');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB fout');
    });
});

// ── GET /defaults — geen auth vereist ────────────────────────────────────────

describe('GET /defaults', () => {
    it('geeft standaardwaarden terug synchroon en zonder auth', () => {
        mockRepo.getDefaults.mockReturnValue({ ph_waarde: { min: 6.8, max: 7.6 } });

        return request(maakApp(null))
            .get('/defaults')
            .expect(200)
            .expect(res => {
                expect(res.body.ph_waarde).toEqual({ min: 6.8, max: 7.6 });
                expect(mockRepo.getDefaults).toHaveBeenCalled();
            });
    });
});

// ── POST / — auth + isAdminOrWaterbeheerder vereist ──────────────────────────

describe('POST /', () => {
    const payload = { parameter_naam: 'ph_waarde', min_waarde: 6.8, max_waarde: 7.6 };

    it('slaat een limiet op voor waterbeheerder', async () => {
        mockRepo.save.mockResolvedValue(undefined);

        const res = await request(maakApp('waterbeheerder')).post('/').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.save).toHaveBeenCalledWith(payload);
    });

    it('slaat een limiet op voor Administrator', async () => {
        mockRepo.save.mockResolvedValue(undefined);

        const res = await request(maakApp('Administrator')).post('/').send(payload);

        expect(res.status).toBe(200);
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/').send(payload);
        expect(res.status).toBe(403);
        expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).post('/').send(payload);
        expect(res.status).toBe(401);
    });
});
