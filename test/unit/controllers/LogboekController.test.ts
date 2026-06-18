import request from 'supertest';
import { LogboekController } from '../../../backend/controllers/LogboekController';
import { ILogboekService } from '../../../backend/services/ILogboekService';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<ILogboekService> = {
    getByDatum: jest.fn(), save: jest.fn(), deleteById: jest.fn(),
};

function maakApp(taak: string | null = 'waterbeheerder') {
    return maakTestApp(new LogboekController(mockService).router, taak);
}

const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('GET /', () => {
    it('delegeert naar de service voor waterbeheerder', async () => {
        mockService.getByDatum.mockResolvedValue([{ id: 1, tijdstip: '10:00:00', auteur: 'X', tekst: 'Aantekening' }]);
        const res = await request(maakApp()).get(`/?datum=${DATUM}`);
        expect(res.status).toBe(200);
        expect(res.body[0].tekst).toBe('Aantekening');
        expect(mockService.getByDatum).toHaveBeenCalledWith(DATUM);
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).get(`/?datum=${DATUM}`)).status).toBe(403);
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).get(`/?datum=${DATUM}`)).status).toBe(401);
    });

    it('geeft 500 bij een fout', async () => {
        mockService.getByDatum.mockRejectedValue(new Error('DB fout'));
        expect((await request(maakApp()).get(`/?datum=${DATUM}`)).status).toBe(500);
    });
});

describe('POST /', () => {
    it('geeft het service-resultaat (id + auteur) terug en geeft de gebruiker door', async () => {
        mockService.save.mockResolvedValue({ id: 7, auteur: 'Test User' });
        const res = await request(maakApp()).post('/').send({ datum: DATUM, tijdstip: '10:00:00', tekst: 'Nieuw' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'success', id: 7, auteur: 'Test User' });
        expect(mockService.save).toHaveBeenCalledWith(DATUM, '10:00:00', 'Nieuw',
            expect.objectContaining({ taak: 'waterbeheerder' }));
    });

    it('behandelt ontbrekende tekst als lege string', async () => {
        mockService.save.mockResolvedValue({ id: 1, auteur: 'Test User' });
        await request(maakApp()).post('/').send({ datum: DATUM, tijdstip: '10:00:00' });
        expect(mockService.save).toHaveBeenCalledWith(DATUM, '10:00:00', '', expect.anything());
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/').send({ datum: DATUM, tijdstip: '10:00:00', tekst: 'T' })).status).toBe(403);
    });
});

describe('DELETE /:id', () => {
    it('delegeert het verwijderen', async () => {
        mockService.deleteById.mockResolvedValue(undefined);
        const res = await request(maakApp()).delete('/12');
        expect(res.status).toBe(200);
        expect(mockService.deleteById).toHaveBeenCalledWith('12', expect.objectContaining({ taak: 'waterbeheerder' }));
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).delete('/12')).status).toBe(403);
        expect(mockService.deleteById).not.toHaveBeenCalled();
    });
});
