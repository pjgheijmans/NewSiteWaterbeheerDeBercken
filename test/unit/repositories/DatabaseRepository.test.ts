import { Pool } from 'mysql2/promise';
import { DatabaseRepository } from '../../../backend/repositories/DatabaseRepository';
import { ILimietenRepository } from '../../../backend/repositories/ILimietenRepository';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: DatabaseRepository;
let limietenRepo: jest.Mocked<ILimietenRepository>;
let gebruikersRepo: jest.Mocked<IGebruikersRepository>;

beforeEach(() => {
    pool = maakMockPool();
    limietenRepo = {
        getAll: jest.fn(), getDefaults: jest.fn(), seedDefaults: jest.fn(), save: jest.fn(),
    };
    gebruikersRepo = {
        findByLogin: jest.fn(), getAll: jest.fn(), create: jest.fn(),
        update: jest.fn(), remove: jest.fn(), seedDefaults: jest.fn(),
    };
    repo = new DatabaseRepository(pool as unknown as Pool, limietenRepo, gebruikersRepo);
});

describe('exportRows', () => {
    it('gebruikt de vaste exportquery voor een bekende tabel', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1 }]));
        await repo.exportRows('logboek');
        expect(sqlVan(pool.execute)).toMatch(/FROM logboek ORDER BY datum DESC/i);
    });

    it('valt terug op SELECT * voor een onbekende tabel', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.exportRows('baden');
        expect(sqlVan(pool.execute)).toMatch(/SELECT \* FROM baden/i);
    });
});

describe('truncate', () => {
    it('schakelt FK-checks uit, truncate, en weer in', async () => {
        await repo.truncate('logboek');
        expect(pool.query).toHaveBeenCalledTimes(3);
        expect(String(pool.query.mock.calls[0][0])).toMatch(/FOREIGN_KEY_CHECKS = 0/);
        expect(String(pool.query.mock.calls[1][0])).toMatch(/TRUNCATE TABLE logboek/);
        expect(String(pool.query.mock.calls[2][0])).toMatch(/FOREIGN_KEY_CHECKS = 1/);
    });
});

describe('truncateAll', () => {
    it('truncate alle datatabellen tussen FK-check toggles', async () => {
        await repo.truncateAll();
        // 12 tabellen + 2 FK-toggles = 14 query-aanroepen
        expect(pool.query).toHaveBeenCalledTimes(14);
    });

    it('gaat door als één tabel een fout geeft', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        pool.query.mockImplementation((sql: string) =>
            /metingen_peuterbad/.test(sql)
                ? Promise.reject(new Error('bestaat niet'))
                : Promise.resolve([[], []]));
        await expect(repo.truncateAll()).resolves.toBeUndefined();
        (console.warn as jest.Mock).mockRestore();
    });
});

describe('seedAllDefaults', () => {
    it('delegeert naar limieten- en gebruikers-repository', async () => {
        await repo.seedAllDefaults();
        expect(limietenRepo.seedDefaults).toHaveBeenCalled();
        expect(gebruikersRepo.seedDefaults).toHaveBeenCalled();
    });
});

describe('getBadId', () => {
    it('geeft het id terug bij een match', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 3 }]));
        expect(await repo.getBadId('Diep')).toBe(3);
    });

    it('geeft null terug zonder match', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getBadId('Onbekend')).toBeNull();
    });
});

describe('importRow', () => {
    it('bouwt dynamische INSERT met placeholders en ON DUPLICATE KEY UPDATE', async () => {
        await repo.importRow('logboek', ['datum', 'tekst'], ['2026-05-31', 'Test']);
        const sql = sqlVan(pool.execute);
        expect(sql).toMatch(/INSERT INTO logboek \(datum, tekst\) VALUES \(\?, \?\)/i);
        expect(sql).toMatch(/ON DUPLICATE KEY UPDATE datum = VALUES\(datum\), tekst = VALUES\(tekst\)/i);
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31', 'Test']);
    });
});

describe('setForeignKeyChecks', () => {
    it('schakelt checks in', async () => {
        await repo.setForeignKeyChecks(true);
        expect(sqlVan(pool.execute)).toMatch(/FOREIGN_KEY_CHECKS = 1/);
    });

    it('schakelt checks uit', async () => {
        await repo.setForeignKeyChecks(false);
        expect(sqlVan(pool.execute)).toMatch(/FOREIGN_KEY_CHECKS = 0/);
    });
});
