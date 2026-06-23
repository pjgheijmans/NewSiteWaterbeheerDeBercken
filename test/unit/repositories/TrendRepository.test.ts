import { Pool } from 'mysql2/promise';
import { TrendRepository } from '../../../backend/repositories/TrendRepository';
import { maakMockPool, resultaat, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: TrendRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new TrendRepository(pool as unknown as Pool);
});

describe('getMetingenTrend', () => {
    it('geeft de UNION-rijen terug en gebruikt het bereik viermaal', async () => {
        pool.execute.mockResolvedValue(resultaat([{ datum: '2026-05-01', bad_naam: 'Diep' }]));
        const result = await repo.getMetingenTrend('2026-05-01', '2026-05-31');
        expect(result).toHaveLength(1);
        // UNION ALL met twee BETWEEN-clausules → van,tot,van,tot
        expect(paramsVan(pool.execute)).toEqual([
            '2026-05-01',
            '2026-05-31',
            '2026-05-01',
            '2026-05-31',
        ]);
    });
});

describe('getVerbruikTrend', () => {
    it('combineert algemene en peuterbad-rijen uit twee queries', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([{ datum: '2026-05-01', water_diep: 1000 }]))
            .mockResolvedValueOnce(resultaat([{ datum: '2026-05-01', water: 50 }]));
        const result = await repo.getVerbruikTrend('2026-05-01', '2026-05-31');
        expect(result.algemeen).toHaveLength(1);
        expect(result.peuterbad).toHaveLength(1);
        expect(pool.execute).toHaveBeenCalledTimes(2);
    });

    it('geeft lege arrays terug als er geen data is', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        const result = await repo.getVerbruikTrend('2026-05-01', '2026-05-31');
        expect(result).toEqual({ algemeen: [], peuterbad: [] });
    });
});
