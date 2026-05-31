import { Pool } from 'mysql2/promise';
import { LogboekRepository } from '../../../backend/repositories/LogboekRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: LogboekRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new LogboekRepository(pool as unknown as Pool);
});

describe('getByDatum', () => {
    it('geeft de regels voor een datum terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1, tekst: 'Test' }]));
        expect(await repo.getByDatum('2026-05-31')).toHaveLength(1);
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31']);
    });
});

describe('save', () => {
    it('voert insert uit en leest daarna id + auteur terug', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                              // INSERT
            .mockResolvedValueOnce(resultaat([{ id: 5, auteur: 'Test User' }])); // SELECT terug
        const result = await repo.save('2026-05-31', '10:00:00', 'Tekst', 'Test User');
        expect(result).toEqual({ id: 5, auteur: 'Test User' });
        expect(pool.execute).toHaveBeenCalledTimes(2);
        expect(sqlVan(pool.execute, 0)).toMatch(/INSERT INTO logboek/i);
    });

    it('geeft null terug als de terugleesquery niets oplevert', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))
            .mockResolvedValueOnce(resultaat([]));
        expect(await repo.save('2026-05-31', '10:00:00', '', null)).toBeNull();
    });
});

describe('deleteById', () => {
    it('verwijdert op id', async () => {
        await repo.deleteById('3');
        expect(paramsVan(pool.execute)).toEqual(['3']);
    });
});
