import request from 'supertest';
import { AuthController } from '../../../backend/controllers/AuthController';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { maakTestApp, maakTestGebruiker } from '../../helpers/testApp';

const mockRepo: jest.Mocked<IGebruikersRepository> = {
    findByLogin:  jest.fn(),
    getAll:       jest.fn(),
    create:       jest.fn(),
    update:       jest.fn(),
    remove:       jest.fn(),
    seedDefaults: jest.fn(),
};

function maakApp(taak: string | null = null) {
    const controller = new AuthController(mockRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('POST /login', () => {
    it('logt in en geeft gebruiker terug bij correcte credentials', async () => {
        const gebruiker = maakTestGebruiker('waterbeheerder');
        mockRepo.findByLogin.mockResolvedValue(gebruiker);

        const res = await request(maakApp())
            .post('/login')
            .send({ username: 'pheijmans', password: 'Paul' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.gebruiker.taak).toBe('waterbeheerder');
        expect(mockRepo.findByLogin).toHaveBeenCalledWith('pheijmans', 'Paul');
    });

    it('geeft 401 terug bij onjuiste credentials', async () => {
        mockRepo.findByLogin.mockResolvedValue(null);

        const res = await request(maakApp())
            .post('/login')
            .send({ username: 'wrong', password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/inlognaam|wachtwoord/i);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockRepo.findByLogin.mockRejectedValue(new Error('DB onbereikbaar'));

        const res = await request(maakApp())
            .post('/login')
            .send({ username: 'test', password: 'test' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('DB onbereikbaar');
    });
});

describe('POST /logout', () => {
    it('vernietigt de sessie en geeft success terug', async () => {
        const res = await request(maakApp('waterbeheerder')).post('/logout');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
    });
});

describe('GET /ingelogd', () => {
    it('geeft ingelogd:true terug als er een sessie-gebruiker is', async () => {
        const res = await request(maakApp('waterbeheerder')).get('/ingelogd');
        expect(res.status).toBe(200);
        expect(res.body.ingelogd).toBe(true);
        expect(res.body.gebruiker.taak).toBe('waterbeheerder');
    });

    it('geeft ingelogd:false terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/ingelogd');
        expect(res.status).toBe(200);
        expect(res.body.ingelogd).toBe(false);
    });
});
