import request from 'supertest';
import { LimietenController } from '../../../backend/controllers/LimietenController';
import { ILimietenService } from '../../../backend/services/ILimietenService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<ILimietenService> = {
    getAll: jest.fn(), getDefaults: jest.fn(), save: jest.fn(),
};

function maakApp(taak: string | null = 'Administrator') {
    return maakTestApp(new LimietenController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET / (beheer-domein)', () => {
    it('geeft de limietenmap terug voor het beheer-domein', async () => {
        mockService.getAll.mockResolvedValue({ ph_waarde: { min: 6.8, max: 7.6 } });
        const res = await request(maakApp('Administrator')).get('/');
        expect(res.status).toBe(200);
        expect(res.body.ph_waarde).toEqual({ min: 6.8, max: 7.6 });
    });

    it('geeft 403 voor een niet-beheer-rol', async () => {
        expect((await request(maakApp('coordinator')).get('/')).status).toBe(403);
        expect(mockService.getAll).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/')).status).toBe(401);
    });

    it('geeft 500 bij een fout in de service', async () => {
        mockService.getAll.mockRejectedValue(new Error('DB fout'));
        expect((await request(maakApp('Administrator')).get('/')).status).toBe(500);
    });
});

describe('GET /defaults (beheer-domein)', () => {
    it('geeft de standaardwaarden terug voor het beheer-domein', async () => {
        mockService.getDefaults.mockReturnValue({ ph_waarde: { min: 6.8, max: 7.6 } });
        const res = await request(maakApp('Administrator')).get('/defaults');
        expect(res.status).toBe(200);
        expect(mockService.getDefaults).toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/defaults')).status).toBe(401);
    });
});

describe('POST / (alleen beheer)', () => {
    const payload = { parameter_naam: 'ph_waarde', min_waarde: 6.8, max_waarde: 7.6 };

    it('slaat op voor Administrator', async () => {
        mockService.save.mockResolvedValue(undefined);
        const res = await request(maakApp('Administrator')).post('/').send(payload);
        expect(res.status).toBe(200);
        expect(mockService.save).toHaveBeenCalledWith(payload);
    });

    it('geeft 403 voor waterbeheerder', async () => {
        expect((await request(maakApp('waterbeheerder')).post('/').send(payload)).status).toBe(403);
        expect(mockService.save).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/').send(payload)).status).toBe(403);
        expect(mockService.save).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).post('/').send(payload)).status).toBe(401);
    });
});
