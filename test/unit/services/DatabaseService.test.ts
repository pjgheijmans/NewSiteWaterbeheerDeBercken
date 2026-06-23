import { DatabaseService } from '../../../backend/services/DatabaseService';
import { IDatabaseRepository } from '../../../backend/repositories/IDatabaseRepository';
import { AppError } from '../../../backend/errors';

const repo: jest.Mocked<IDatabaseRepository> = {
    exportRows: jest.fn(),
    runInitSql: jest.fn(),
    truncate: jest.fn(),
    truncateAll: jest.fn(),
    seedAllDefaults: jest.fn(),
    getBadId: jest.fn(),
    importRow: jest.fn(),
    setForeignKeyChecks: jest.fn(),
};
const service = new DatabaseService(repo);
beforeEach(() => jest.clearAllMocks());

describe('exporteerCsv', () => {
    it('bouwt CSV met header en puntkomma-scheiding', async () => {
        repo.exportRows.mockResolvedValue([{ id: 1, tekst: 'Test' }]);
        const csv = await service.exporteerCsv('logboek');
        expect(csv).toBe('id;tekst\r\n1;Test\r\n');
    });

    it('geeft null terug bij een lege tabel', async () => {
        repo.exportRows.mockResolvedValue([]);
        expect(await service.exporteerCsv('logboek')).toBeNull();
    });

    it('formatteert Date naar ISO-datum, null naar leeg en vervangt puntkomma door komma', async () => {
        repo.exportRows.mockResolvedValue([
            { datum: new Date('2026-05-31T12:00:00Z'), leeg: null, tekst: 'a;b' },
        ]);
        const csv = await service.exporteerCsv('logboek');
        expect(csv).toBe('datum;leeg;tekst\r\n2026-05-31;;a,b\r\n');
    });
});

describe('importeerCsv', () => {
    it('gooit AppError 400 bij lege invoer', async () => {
        await expect(service.importeerCsv('logboek', '')).rejects.toMatchObject({ status: 400 });
    });

    it('gooit AppError 400 als er alleen een header is', async () => {
        await expect(service.importeerCsv('logboek', 'datum;tekst\r\n')).rejects.toMatchObject({
            status: 400,
        });
    });

    it('importeert rijen en toggelt FK-checks uit en weer in', async () => {
        await service.importeerCsv('logboek', 'datum;tekst\r\n2026-05-31;Test\r\n');
        expect(repo.setForeignKeyChecks).toHaveBeenNthCalledWith(1, false);
        expect(repo.importRow).toHaveBeenCalledWith(
            'logboek',
            ['datum', 'tekst'],
            ['2026-05-31', 'Test'],
        );
        expect(repo.setForeignKeyChecks).toHaveBeenLastCalledWith(true);
    });

    it('vertaalt bad_naam naar bad_id voor metingen-tabellen', async () => {
        repo.getBadId.mockResolvedValue(1);
        await service.importeerCsv('metingen_diep_ondiep', 'bad_naam;ph_waarde\r\nDiep;7.2\r\n');
        expect(repo.getBadId).toHaveBeenCalledWith('Diep');
        const [tabel, cols] = repo.importRow.mock.calls[0];
        expect(tabel).toBe('metingen_diep_ondiep');
        expect(cols).toContain('bad_id');
        expect(cols).not.toContain('bad_naam');
    });

    it('slaat regels met een afwijkend kolomaantal over', async () => {
        await service.importeerCsv('logboek', 'datum;tekst\r\n2026-05-31\r\n2026-05-31;Test\r\n');
        // Alleen de geldige regel wordt geïmporteerd
        expect(repo.importRow).toHaveBeenCalledTimes(1);
    });

    it('schakelt FK-checks weer in als importRow faalt', async () => {
        repo.importRow.mockRejectedValue(new Error('FK violation'));
        await expect(
            service.importeerCsv('logboek', 'datum;tekst\r\n2026-05-31;Test\r\n'),
        ).rejects.toThrow('FK violation');
        expect(repo.setForeignKeyChecks).toHaveBeenLastCalledWith(true);
    });
});

describe('delegerende methoden', () => {
    it('truncate', async () => {
        await service.truncate('logboek');
        expect(repo.truncate).toHaveBeenCalledWith('logboek');
    });

    it('wisAlles', async () => {
        await service.wisAlles();
        expect(repo.truncateAll).toHaveBeenCalled();
    });

    it('initialiseer voert init-sql, truncate en seed in volgorde uit', async () => {
        await service.initialiseer();
        expect(repo.runInitSql).toHaveBeenCalled();
        expect(repo.truncateAll).toHaveBeenCalled();
        expect(repo.seedAllDefaults).toHaveBeenCalled();
    });
});
