import request from 'supertest';
import { DatabaseController } from '../../../backend/controllers/DatabaseController';
import { IDatabaseRepository } from '../../../backend/repositories/IDatabaseRepository';
import { maakTestApp } from '../../helpers/testApp';

const mockRepo: jest.Mocked<IDatabaseRepository> = {
    exportRows:          jest.fn(),
    runInitSql:          jest.fn(),
    truncate:            jest.fn(),
    truncateAll:         jest.fn(),
    seedAllDefaults:     jest.fn(),
    getBadId:            jest.fn(),
    importRow:           jest.fn(),
    setForeignKeyChecks: jest.fn(),
};

// DatabaseController vereist isAdminOrWaterbeheerder
function maakApp(taak: string | null = 'waterbeheerder') {
    const controller = new DatabaseController(mockRepo);
    return maakTestApp(controller.router, taak);
}

beforeEach(() => jest.clearAllMocks());

// ── POST /truncate/:tabelnaam ─────────────────────────────────────────────────

describe('POST /truncate/:tabelnaam', () => {
    it('leegt een toegestane tabel', async () => {
        mockRepo.truncate.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/truncate/logboek');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.truncate).toHaveBeenCalledWith('logboek');
    });

    it('geeft 400 terug voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp()).post('/truncate/geheim_schema');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/tabelnaam/i);
        expect(mockRepo.truncate).not.toHaveBeenCalled();
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/truncate/logboek');
        expect(res.status).toBe(403);
    });

    it('geeft 401 terug zonder sessie', async () => {
        const res = await request(maakApp(null)).post('/truncate/logboek');
        expect(res.status).toBe(401);
    });
});

// ── GET /export/:tabelnaam ────────────────────────────────────────────────────

describe('GET /export/:tabelnaam', () => {
    it('exporteert een toegestane tabel als CSV', async () => {
        mockRepo.exportRows.mockResolvedValue([
            { id: 1, datum: '2026-05-31', tekst: 'Test' },
        ]);

        const res = await request(maakApp()).get('/export/logboek');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.headers['content-disposition']).toMatch(/logboek/);
        expect(res.text).toContain('id;datum;tekst');
        expect(res.text).toContain('2026-05-31');
    });

    it('geeft 404 terug als de tabel leeg is', async () => {
        mockRepo.exportRows.mockResolvedValue([]);

        const res = await request(maakApp()).get('/export/logboek');

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/leeg/i);
    });

    it('geeft 400 terug voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp()).get('/export/geheim_schema');
        expect(res.status).toBe(400);
        expect(mockRepo.exportRows).not.toHaveBeenCalled();
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).get('/export/logboek');
        expect(res.status).toBe(403);
    });
});

// ── POST /import/:tabelnaam ───────────────────────────────────────────────────

describe('POST /import/:tabelnaam', () => {
    const csv = 'datum;tijdstip;auteur;tekst\r\n2026-05-31;10:00:00;Test;Aantekening\r\n';

    it('importeert CSV in een toegestane tabel', async () => {
        mockRepo.setForeignKeyChecks.mockResolvedValue(undefined);
        mockRepo.importRow.mockResolvedValue(undefined);

        const res = await request(maakApp())
            .post('/import/logboek')
            .set('Content-Type', 'text/csv')
            .send(csv);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.setForeignKeyChecks).toHaveBeenCalledWith(false);
        expect(mockRepo.setForeignKeyChecks).toHaveBeenCalledWith(true);
        expect(mockRepo.importRow).toHaveBeenCalledWith(
            'logboek',
            expect.arrayContaining(['datum', 'tijdstip']),
            expect.any(Array)
        );
    });

    it('geeft 400 terug voor een niet-toegestane tabelnaam', async () => {
        const res = await request(maakApp())
            .post('/import/geheim_schema')
            .set('Content-Type', 'text/csv')
            .send(csv);

        expect(res.status).toBe(400);
        expect(mockRepo.importRow).not.toHaveBeenCalled();
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator'))
            .post('/import/logboek')
            .set('Content-Type', 'text/csv')
            .send(csv);
        expect(res.status).toBe(403);
    });
});

// ── POST /verwijder-alles ─────────────────────────────────────────────────────

describe('POST /verwijder-alles', () => {
    it('wist alle tabellen en vernietigt de sessie', async () => {
        mockRepo.truncateAll.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/verwijder-alles');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.truncateAll).toHaveBeenCalled();
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/verwijder-alles');
        expect(res.status).toBe(403);
        expect(mockRepo.truncateAll).not.toHaveBeenCalled();
    });
});

// ── POST /initialiseer ────────────────────────────────────────────────────────

describe('POST /initialiseer', () => {
    it('voert init sql uit, wist data en zaait standaardwaarden', async () => {
        mockRepo.runInitSql.mockResolvedValue(undefined);
        mockRepo.truncateAll.mockResolvedValue(undefined);
        mockRepo.seedAllDefaults.mockResolvedValue(undefined);

        const res = await request(maakApp()).post('/initialiseer');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockRepo.runInitSql).toHaveBeenCalled();
        expect(mockRepo.truncateAll).toHaveBeenCalled();
        expect(mockRepo.seedAllDefaults).toHaveBeenCalled();
    });

    it('geeft 403 terug voor coordinator', async () => {
        const res = await request(maakApp('coordinator')).post('/initialiseer');
        expect(res.status).toBe(403);
        expect(mockRepo.runInitSql).not.toHaveBeenCalled();
    });
});
