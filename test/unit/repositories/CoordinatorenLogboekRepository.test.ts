import { Pool } from 'mysql2/promise';
import { CoordinatorenLogboekRepository } from '../../../backend/repositories/CoordinatorenLogboekRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: CoordinatorenLogboekRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new CoordinatorenLogboekRepository(pool as unknown as Pool);
});

describe('getByDatum', () => {
    it('queryt de coordinatoren_logboek tabel', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1 }]));
        await repo.getByDatum('2026-05-31');
        expect(sqlVan(pool.execute)).toMatch(/FROM coordinatoren_logboek/i);
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31']);
    });
});

describe('save', () => {
    it('insert + terugleesquery, geeft id en auteur terug', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))
            .mockResolvedValueOnce(resultaat([{ id: 8, auteur: 'Co Ord' }]));
        const result = await repo.save('2026-05-31', '11:00:00', 'Tekst', 'Co Ord');
        expect(result).toEqual({ id: 8, auteur: 'Co Ord' });
        expect(sqlVan(pool.execute, 0)).toMatch(/INSERT INTO coordinatoren_logboek/i);
    });
});

describe('deleteById', () => {
    it('verwijdert uit de coordinatoren_logboek tabel', async () => {
        await repo.deleteById('4');
        expect(sqlVan(pool.execute)).toMatch(/DELETE FROM coordinatoren_logboek/i);
        expect(paramsVan(pool.execute)).toEqual(['4']);
    });
});
