import request from 'supertest';
import { DienstController } from '../../../backend/controllers/DienstController';
import { IDienstService } from '../../../backend/services/IDienstService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IDienstService> = {
    getDienst: jest.fn(), saveDienst: jest.fn(), getWaterbeheerders: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new DienstController(mockService).router, taak);
}

const DATUM = '2026-06-08';
beforeEach(() => jest.clearAllMocks());

describe('GET / (login vereist)', () => {
    it('geeft de dienst van een dag terug', async () => {
        mockService.getDienst.mockResolvedValue({ dienst_1: 'Jan', dienst_2: 'Piet' });
        const res = await request(maakApp('waterbeheerder')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ dienst_1: 'Jan', dienst_2: 'Piet' });
        expect(mockService.getDienst).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get(`/?datum=${DATUM}`)).status).toBe(401);
    });
});

describe('GET /waterbeheerders (login vereist)', () => {
    it('geeft de namenlijst terug', async () => {
        mockService.getWaterbeheerders.mockResolvedValue(['Anna Bos', 'Piet Jansen']);
        const res = await request(maakApp('waterbeheerder')).get('/waterbeheerders');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(['Anna Bos', 'Piet Jansen']);
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/waterbeheerders')).status).toBe(401);
    });
});

describe('POST / (waterbeheer-domein)', () => {
    const payload = { datum: DATUM, dienst_1: 'Jan', dienst_2: 'Piet' };

    it('slaat op voor waterbeheerder', async () => {
        mockService.saveDienst.mockResolvedValue(undefined);
        const res = await request(maakApp('waterbeheerder')).post('/').send(payload);
        expect(res.status).toBe(200);
        expect(mockService.saveDienst).toHaveBeenCalledWith(payload);
    });

    it('geeft 403 voor Administrator zonder waterbeheer-recht', async () => {
        expect((await request(maakApp('Administrator')).post('/').send(payload)).status).toBe(403);
        expect(mockService.saveDienst).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/').send(payload)).status).toBe(403);
        expect(mockService.saveDienst).not.toHaveBeenCalled();
    });

    it('geeft 400 zonder datum', async () => {
        const res = await request(maakApp('waterbeheerder')).post('/').send({ dienst_1: 'Jan' });
        expect(res.status).toBe(400);
        expect(mockService.saveDienst).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).post('/').send(payload)).status).toBe(401);
    });
});
