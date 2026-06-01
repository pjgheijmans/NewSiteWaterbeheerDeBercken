import request from 'supertest';
import { AuthController } from '../../../backend/controllers/AuthController';
import { IAuthService } from '../../../backend/services/IAuthService';
import { maakTestApp, maakTestGebruiker } from '../../helpers/testApp';

const mockService: jest.Mocked<IAuthService> = {
    login: jest.fn(),
};

function maakApp(taak: string | null = null) {
    return maakTestApp(new AuthController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('POST /login', () => {
    it('logt in en geeft de gebruiker terug bij correcte credentials', async () => {
        mockService.login.mockResolvedValue(maakTestGebruiker('waterbeheerder'));
        const res = await request(maakApp())
            .post('/login').send({ username: 'pheijmans', password: 'Paul' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.gebruiker.taak).toBe('waterbeheerder');
        expect(mockService.login).toHaveBeenCalledWith('pheijmans', 'Paul');
    });

    it('geeft 401 bij onjuiste credentials', async () => {
        mockService.login.mockResolvedValue(null);
        const res = await request(maakApp())
            .post('/login').send({ username: 'wrong', password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/inlognaam|wachtwoord/i);
    });

    it('geeft 500 bij een fout in de service (via errorHandler)', async () => {
        mockService.login.mockRejectedValue(new Error('DB onbereikbaar'));
        const res = await request(maakApp())
            .post('/login').send({ username: 'x', password: 'y' });
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB onbereikbaar');
    });
});

describe('POST /logout', () => {
    it('vernietigt de sessie', async () => {
        const res = await request(maakApp('waterbeheerder')).post('/logout');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
    });
});

describe('GET /ingelogd', () => {
    it('geeft ingelogd:true met sessie', async () => {
        const res = await request(maakApp('waterbeheerder')).get('/ingelogd');
        expect(res.body.ingelogd).toBe(true);
    });

    it('geeft ingelogd:false zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/ingelogd');
        expect(res.body.ingelogd).toBe(false);
    });
});
