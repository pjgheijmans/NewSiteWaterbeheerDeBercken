import request from 'supertest';
import { DatabaseController } from '../../../backend/controllers/DatabaseController';
import { IDatabaseService } from '../../../backend/services/IDatabaseService';
import { AppError } from '../../../backend/errors';
import { maakTestApp } from '../../helpers/testApp';

const mockService: jest.Mocked<IDatabaseService> = {
    exporteerCsv: jest.fn(),
    importeerCsv: jest.fn(),
    truncate: jest.fn(),
    wisAlles: jest.fn(),
    initialiseer: jest.fn(),
};

function maakApp(taak: string | null = 'Administrator') {
    return maakTestApp(new DatabaseController(mockService).router, taak);
}

beforeEach(() => jest.clearAllMocks());

describe('POST /truncate/:tabelnaam', () => {
    it('delegeert het legen van een toegestane tabel', async () => {
        mockService.truncate.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/truncate/logboek');
        expect(res.status).toBe(200);
        expect(mockService.truncate).toHaveBeenCalledWith('logboek');
    });

    it('geeft 400 voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp()).post('/truncate/geheim_schema');
        expect(res.status).toBe(400);
        expect(mockService.truncate).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/truncate/logboek')).status).toBe(403);
    });

    it('geeft 401 zonder sessie', async () => {
        expect((await request(maakApp(null)).post('/truncate/logboek')).status).toBe(401);
    });
});

describe('GET /export/:tabelnaam', () => {
    it('stuurt de CSV van de service met de juiste headers', async () => {
        mockService.exporteerCsv.mockResolvedValue('id;datum;tekst\r\n1;2026-05-31;Test\r\n');
        const res = await request(maakApp()).get('/export/logboek');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.headers['content-disposition']).toMatch(/logboek/);
        expect(res.text).toContain('2026-05-31');
    });

    it('geeft 404 als de service null teruggeeft (lege tabel)', async () => {
        mockService.exporteerCsv.mockResolvedValue(null);
        const res = await request(maakApp()).get('/export/logboek');
        expect(res.status).toBe(404);
    });

    it('geeft 400 voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp()).get('/export/geheim_schema');
        expect(res.status).toBe(400);
        expect(mockService.exporteerCsv).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).get('/export/logboek')).status).toBe(403);
    });
});

describe('POST /import/:tabelnaam', () => {
    const csv = 'datum;tijdstip;auteur;tekst\r\n2026-05-31;10:00:00;Test;Aantekening\r\n';

    it('delegeert het importeren naar de service', async () => {
        mockService.importeerCsv.mockResolvedValue(undefined);
        const res = await request(maakApp())
            .post('/import/logboek')
            .set('Content-Type', 'text/csv')
            .send(csv);
        expect(res.status).toBe(200);
        expect(mockService.importeerCsv).toHaveBeenCalledWith('logboek', csv);
    });

    it('propageert een AppError 400 van de service', async () => {
        mockService.importeerCsv.mockRejectedValue(
            new AppError('CSV-bestand bevat geen data', 400),
        );
        const res = await request(maakApp())
            .post('/import/logboek')
            .set('Content-Type', 'text/csv')
            .send('alleen-een-header\r\n');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/geen data/i);
    });

    it('geeft 400 voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp())
            .post('/import/geheim_schema')
            .set('Content-Type', 'text/csv')
            .send(csv);
        expect(res.status).toBe(400);
        expect(mockService.importeerCsv).not.toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect(
            (
                await request(maakApp('coordinator'))
                    .post('/import/logboek')
                    .set('Content-Type', 'text/csv')
                    .send(csv)
            ).status,
        ).toBe(403);
    });
});

describe('actie_teksten is opgenomen in de whitelists', () => {
    it('mag geëxporteerd worden', async () => {
        mockService.exporteerCsv.mockResolvedValue(
            'actie_sleutel;sjabloon\r\nchloor_bestellen;Chloor bestellen\r\n',
        );
        const res = await request(maakApp()).get('/export/actie_teksten');
        expect(res.status).toBe(200);
        expect(mockService.exporteerCsv).toHaveBeenCalledWith('actie_teksten');
    });

    it('mag geïmporteerd worden', async () => {
        const csv = 'actie_sleutel;sjabloon\r\nchloor_bestellen;Chloor bestellen\r\n';
        mockService.importeerCsv.mockResolvedValue(undefined);
        const res = await request(maakApp())
            .post('/import/actie_teksten')
            .set('Content-Type', 'text/csv')
            .send(csv);
        expect(res.status).toBe(200);
        expect(mockService.importeerCsv).toHaveBeenCalledWith('actie_teksten', csv);
    });

    it('mag geleegd worden (reset naar standaardteksten)', async () => {
        mockService.truncate.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/truncate/actie_teksten');
        expect(res.status).toBe(200);
        expect(mockService.truncate).toHaveBeenCalledWith('actie_teksten');
    });
});

describe('waterbeheer_dienst is opgenomen in de whitelists', () => {
    it('mag geëxporteerd, geïmporteerd en geleegd worden', async () => {
        mockService.exporteerCsv.mockResolvedValue(
            'datum;dienst_1;dienst_2\r\n2026-06-08;Jan;Piet\r\n',
        );
        mockService.importeerCsv.mockResolvedValue(undefined);
        mockService.truncate.mockResolvedValue(undefined);

        expect((await request(maakApp()).get('/export/waterbeheer_dienst')).status).toBe(200);
        const imp = await request(maakApp())
            .post('/import/waterbeheer_dienst')
            .set('Content-Type', 'text/csv')
            .send('datum;dienst_1\r\n2026-06-08;Jan\r\n');
        expect(imp.status).toBe(200);
        expect((await request(maakApp()).post('/truncate/waterbeheer_dienst')).status).toBe(200);
    });
});

describe('POST /verwijder-alles', () => {
    it('wist alle data en vernietigt de sessie', async () => {
        mockService.wisAlles.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/verwijder-alles');
        expect(res.status).toBe(200);
        expect(mockService.wisAlles).toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/verwijder-alles')).status).toBe(403);
        expect(mockService.wisAlles).not.toHaveBeenCalled();
    });
});

describe('POST /initialiseer', () => {
    it('delegeert de (her)initialisatie en vernietigt de sessie', async () => {
        mockService.initialiseer.mockResolvedValue(undefined);
        const res = await request(maakApp()).post('/initialiseer');
        expect(res.status).toBe(200);
        expect(mockService.initialiseer).toHaveBeenCalled();
    });

    it('geeft 403 voor coordinator', async () => {
        expect((await request(maakApp('coordinator')).post('/initialiseer')).status).toBe(403);
        expect(mockService.initialiseer).not.toHaveBeenCalled();
    });
});
