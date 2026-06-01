import request from 'supertest';
import { GebruikersController } from '../../../backend/controllers/GebruikersController';
import { IGebruikersService } from '../../../backend/services/IGebruikersService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IGebruikersService> = {
    getAll: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new GebruikersController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('GET /', () => {
    it('geeft de gebruikerslijst terug voor waterbeheerder', async () => {
        mockService.getAll.mockResolvedValue([
            { id: 1, voornaam: 'Paul', achternaam: 'H', inlognaam: 'pheijmans', wachtwoord: '***', taak: 'waterbeheerder' },
        ]);
        const res = await request(maakApp()).get('/');
        expect(res.status).toBe(200);
        expect(res.body[0].inlognaam).toBe('pheijmans');
    });

    it('staat Administrator toe', async () => {
        mockService.getAll.mockResolvedValue([]);
        expect((await request(maakApp('Administrator')).get('/')).status).toBe(200);
    });

    it('geeft 403 voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get('/');
        expect(res.status).toBe(403);
        expect(mockService.getAll).not.toHaveBeenCalled();
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get('/')).status).toBe(401);
    });

    it('geeft 500 bij een fout in de service', async () => {
        mockService.getAll.mockRejectedValue(new Error('DB fout'));
        expect((await request(maakApp()).get('/')).status).toBe(500);
    });
});

describe('POST /', () => {
    const nieuw = { voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen', wachtwoord: 'geheim', taak: 'coordinator' };

    it('delegeert het aanmaken naar de service', async () => {
        mockService.create.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/').send(nieuw);
        expect(res.status).toBe(200);
        expect(mockService.create).toHaveBeenCalledWith(nieuw);
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/').send(nieuw)).status).toBe(403);
        expect(mockService.create).not.toHaveBeenCalled();
    });
});

describe('PUT /:id', () => {
    const wijziging = { voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen', wachtwoord: 'nieuw', taak: 'waterbeheerder' };

    it('delegeert de wijziging met het id', async () => {
        mockService.update.mockResolvedValue(undefined);
        const res = await request(maakApp()).put('/42').send(wijziging);
        expect(res.status).toBe(200);
        expect(mockService.update).toHaveBeenCalledWith('42', wijziging);
    });
});

describe('DELETE /:id', () => {
    it('delegeert het verwijderen met het id', async () => {
        mockService.remove.mockResolvedValue(undefined);
        const res = await request(maakApp()).delete('/5');
        expect(res.status).toBe(200);
        expect(mockService.remove).toHaveBeenCalledWith('5');
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).delete('/5')).status).toBe(403);
        expect(mockService.remove).not.toHaveBeenCalled();
    });
});
