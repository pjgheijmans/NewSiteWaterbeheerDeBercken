import request from 'supertest';
import { ActieTekstenController } from '../../../backend/controllers/ActieTekstenController';
import { IActieTekstenService } from '../../../backend/services/IActieTekstenService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IActieTekstenService> = {
    getAll: jest.fn(), getDefaults: jest.fn(), save: jest.fn(),
};

function maakApp(taak: string | null = 'Administrator') {
    return maakTestApp(new ActieTekstenController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET / (login vereist, elke rol)', () => {
    it('geeft de sjablonen terug voor een ingelogde gebruiker', async () => {
        mockService.getAll.mockResolvedValue([
            { actie_sleutel: 'chloor_bestellen', sjabloon: 'Chloor bestellen', omschrijving: null },
        ]);
        const res = await request(maakApp('coordinator')).get('/');
        expect(res.status).toBe(200);
        expect(res.body[0].actie_sleutel).toBe('chloor_bestellen');
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/')).status).toBe(401);
    });

    it('geeft 500 bij een fout in de service', async () => {
        mockService.getAll.mockRejectedValue(new Error('DB fout'));
        expect((await request(maakApp('Administrator')).get('/')).status).toBe(500);
    });
});

describe('GET /defaults (login vereist)', () => {
    it('geeft de standaardteksten terug voor een ingelogde gebruiker', async () => {
        mockService.getDefaults.mockReturnValue([
            { actie_sleutel: 'chloor_bestellen', sjabloon: 'Chloor bestellen', omschrijving: null },
        ]);
        const res = await request(maakApp('Administrator')).get('/defaults');
        expect(res.status).toBe(200);
        expect(mockService.getDefaults).toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/defaults')).status).toBe(401);
    });
});

describe('POST / (alleen Administrator)', () => {
    const payload = { actie_sleutel: 'chloor_bestellen', sjabloon: 'Nieuwe tekst {drempel}' };

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

    it('geeft 400 bij een leeg sjabloon', async () => {
        const res = await request(maakApp('Administrator')).post('/').send({ actie_sleutel: 'x', sjabloon: '' });
        expect(res.status).toBe(400);
        expect(mockService.save).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).post('/').send(payload)).status).toBe(401);
    });
});
