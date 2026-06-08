import { Pool } from 'mysql2/promise';
import { DienstRepository } from '../../../backend/repositories/DienstRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: DienstRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new DienstRepository(pool as unknown as Pool);
});

describe('getDienst', () => {
    it('geeft de dienst van een dag terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ dienst_1: 'Jan', dienst_2: 'Piet' }]));
        const dienst = await repo.getDienst('2026-06-08');
        expect(dienst).toEqual({ dienst_1: 'Jan', dienst_2: 'Piet' });
        expect(paramsVan(pool.execute)).toEqual(['2026-06-08']);
    });

    it('geeft lege velden terug zonder rij', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getDienst('2026-06-08')).toEqual({ dienst_1: null, dienst_2: null });
    });
});

describe('saveDienst', () => {
    it('upsert met INSERT ... ON DUPLICATE KEY UPDATE', async () => {
        await repo.saveDienst({ datum: '2026-06-08', dienst_1: 'Jan', dienst_2: 'Piet' });
        expect(sqlVan(pool.execute)).toMatch(/ON DUPLICATE KEY UPDATE/i);
        expect(paramsVan(pool.execute)).toEqual(['2026-06-08', 'Jan', 'Piet']);
    });

    it('schrijft null weg voor ontbrekende namen', async () => {
        await repo.saveDienst({ datum: '2026-06-08' });
        expect(paramsVan(pool.execute)).toEqual(['2026-06-08', null, null]);
    });
});
