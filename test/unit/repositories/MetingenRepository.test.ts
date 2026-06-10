import { Pool } from 'mysql2/promise';
import { MetingenRepository } from '../../../backend/repositories/MetingenRepository';
import { AppError } from '../../../backend/errors';
import { maakMockPool, resultaat, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: MetingenRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new MetingenRepository(pool as unknown as Pool);
});

describe('getMetingen', () => {
    it('geeft de rijen terug en gebruikt datum tweemaal (UNION)', async () => {
        pool.execute.mockResolvedValue(resultaat([{ bad_naam: 'Diep' }]));
        const result = await repo.getMetingen('2026-05-31');
        expect(result).toEqual([{ bad_naam: 'Diep' }]);
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31', '2026-05-31']);
    });
});

describe('getBadId', () => {
    it('geeft het id terug als het bad bestaat', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 7 }]));
        expect(await repo.getBadId('Diep')).toBe(7);
        expect(paramsVan(pool.execute)).toEqual(['Diep']);
    });

    it('gooit AppError 400 als het bad niet bestaat', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await expect(repo.getBadId('Onbekend')).rejects.toThrow(AppError);
        await expect(repo.getBadId('Onbekend')).rejects.toMatchObject({ status: 400 });
    });
});

describe('savePeuterbadMeting', () => {
    it('zet ontbrekende velden om naar null en gebruikt filter_druk-fallback', async () => {
        await repo.savePeuterbadMeting(3, { datum: '2026-05-31', bad_naam: 'Peuterbad', ph_waarde: 7.0 });
        const params = paramsVan(pool.execute);
        expect(params[0]).toBe(3);
        expect(params[1]).toBe('2026-05-31');
        expect(params[2]).toBe(7.0);
        // chloor_waarde, flow ontbreken → null
        expect(params[3]).toBeNull();
        expect(params[4]).toBeNull();
    });

    it('gebruikt filter_druk als filter_druk_in ontbreekt', async () => {
        await repo.savePeuterbadMeting(3, { datum: '2026-05-31', bad_naam: 'Peuterbad', filter_druk: 0.8 });
        const params = paramsVan(pool.execute);
        expect(params[5]).toBe(0.8); // filter_druk ?? filter_druk_in ?? null
    });
});

describe('saveGrootBadMeting', () => {
    it('zet alle ontbrekende meetwaarden om naar null', async () => {
        await repo.saveGrootBadMeting(1, { datum: '2026-05-31', bad_naam: 'Diep' });
        const params = paramsVan(pool.execute);
        expect(params[0]).toBe(1);
        expect(params[1]).toBe('2026-05-31');
        expect(params.slice(2)).toEqual([null, null, null, null, null, null, null]);
    });
});
