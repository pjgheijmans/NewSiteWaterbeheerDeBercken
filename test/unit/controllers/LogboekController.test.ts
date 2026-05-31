import request from 'supertest';
import { LogboekController } from '../../../backend/controllers/LogboekController';
import { ILogboekRepository } from '../../../backend/repositories/ILogboekRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<ILogboekRepository> = {
    getByDatum: jest.fn(),
    save:       jest.fn(),
    deleteById: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new LogboekController(mockRepo);
    return maakTestApp(controller.router, taak);
}

const DATUM = '2026-05-31';

beforeEach(() => jest.clearAllMocks());

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /', () => {
    it('geeft logboekregels terug voor waterbeheerder', async () => {
        mockRepo.getByDatum.mockResolvedValue([
            { id: 1, tijdstip: '10:00:00', auteur: 'Test User', tekst: 'Aantekening' },
        ]);

        const res = await request(maakApp()).get(`/?datum=${DATUM}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].tekst).toBe('Aantekening');
        expect(mockRepo.getByDatum).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
        expect(mockRepo.getByDatum).not.toHaveBeenCalled();
    });

    it('geeft 403 terug voor Administrator', async () => {
        const res = await request(maakApp('Administrator')).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(403);
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(401);
    });

    it('geeft 500 terug bij databasefout', async () => {
        mockRepo.getByDatum.mockRejectedValue(new Error('DB fout'));
        const res = await request(maakApp()).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(500);
    });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /', () => {
    it('slaat een logboekregel op en geeft id en auteur terug', async () => {
        mockRepo.save.mockResolvedValue({ id: 7, auteur: 'Test User' });

        const res = await request(maakApp()).post('/').send({
            datum: DATUM, tijdstip: '10:00:00', tekst: 'Nieuwe aantekening',
        });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.id).toBe(7);
        expect(res.body.auteur).toBe('Test User');
        // auteur = 'Test User' van de testgebruiker
        expect(mockRepo.save).toHaveBeenCalledWith(
            DATUM, '10:00:00', 'Nieuwe aantekening', 'Test User'
        );
    });

    it('gebruikt fallback auteur als repo null teruggeeft', async () => {
        mockRepo.save.mockResolvedValue(null);

        const res = await request(maakApp()).post('/').send({
            datum: DATUM, tijdstip: '10:00:00', tekst: '',
        });

        expect(res.status).toBe(200);
        // row is null → auteur fallback naar sessie-gebruikersnaam
        expect(res.body.auteur).toBe('Test User');
    });

    it('behandelt ontbrekende tekst als lege string', async () => {
        mockRepo.save.mockResolvedValue({ id: 1, auteur: 'Test User' });

        await request(maakApp()).post('/').send({ datum: DATUM, tijdstip: '10:00:00' });

        expect(mockRepo.save).toHaveBeenCalledWith(DATUM, '10:00:00', '', 'Test User');
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/').send({
            datum: DATUM, tijdstip: '10:00:00', tekst: 'Test',
        });
        expect(res.status).toBe(403);
    });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /:id', () => {
    it('verwijdert een logboekregel op id', async () => {
        mockRepo.deleteById.mockResolvedValue(undefined);

        const res = await request(maakApp()).delete('/12');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.deleteById).toHaveBeenCalledWith('12');
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).delete('/12');
        expect(res.status).toBe(403);
        expect(mockRepo.deleteById).not.toHaveBeenCalled();
    });
});
