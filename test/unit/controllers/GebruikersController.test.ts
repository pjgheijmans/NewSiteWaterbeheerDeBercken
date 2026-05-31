import request from 'supertest';
import { GebruikersController } from '../../../backend/controllers/GebruikersController';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<IGebruikersRepository> = {
    findByLogin:  jest.fn(),
    getAll:       jest.fn(),
    create:       jest.fn(),
    update:       jest.fn(),
    remove:       jest.fn(),
    seedDefaults: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new GebruikersController(mockRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /', () => {
    it('geeft lijst met gebruikers terug voor waterbeheerder', async () => {
        mockRepo.getAll.mockResolvedValue([
            { id: 1, voornaam: 'Paul', achternaam: 'H', inlognaam: 'pheijmans', wachtwoord: '***', taak: 'waterbeheerder' },
        ]);

        const res = await request(maakApp()).get('/');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].inlognaam).toBe('pheijmans');
    });

    it('geeft lijst terug voor Administrator', async () => {
        mockRepo.getAll.mockResolvedValue([]);
        const res = await request(maakApp('Administrator')).get('/');
        expect(res.status).toBe(200);
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get('/');
        expect(res.status).toBe(403);
        expect(mockRepo.getAll).not.toHaveBeenCalled();
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get('/');
        expect(res.status).toBe(401);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockRepo.getAll.mockRejectedValue(new Error('DB fout'));
        const res = await request(maakApp()).get('/');
        expect(res.status).toBe(500);
    });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /', () => {
    const nieuweGebruiker = {
        voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen',
        wachtwoord: 'geheim', taak: 'coordinator',
    };

    it('maakt een nieuwe gebruiker aan', async () => {
        mockRepo.create.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/').send(nieuweGebruiker);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.create).toHaveBeenCalledWith(nieuweGebruiker);
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/').send(nieuweGebruiker);
        expect(res.status).toBe(403);
        expect(mockRepo.create).not.toHaveBeenCalled();
    });
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────

describe('PUT /:id', () => {
    const wijziging = {
        voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen',
        wachtwoord: 'nieuw', taak: 'waterbeheerder',
    };

    it('werkt een bestaande gebruiker bij', async () => {
        mockRepo.update.mockResolvedValue(undefined);

        const res = await request(maakApp()).put('/42').send(wijziging);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.update).toHaveBeenCalledWith('42', wijziging);
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).put('/42').send(wijziging);
        expect(res.status).toBe(403);
    });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /:id', () => {
    it('verwijdert een gebruiker', async () => {
        mockRepo.remove.mockResolvedValue(undefined);

        const res = await request(maakApp()).delete('/5');

        expect(res.status).toBe(200);
        expect(mockRepo.remove).toHaveBeenCalledWith('5');
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).delete('/5');
        expect(res.status).toBe(403);
        expect(mockRepo.remove).not.toHaveBeenCalled();
    });
});
