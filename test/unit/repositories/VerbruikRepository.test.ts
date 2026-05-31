import { Pool } from 'mysql2/promise';
import { VerbruikRepository } from '../../../backend/repositories/VerbruikRepository';
import { maakMockPool, resultaat, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: VerbruikRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new VerbruikRepository(pool as unknown as Pool);
});

describe('getVerbruik', () => {
    it('geeft de eerste rij terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ datum: '2026-05-31', water_diep: 1000 }]));
        expect(await repo.getVerbruik('2026-05-31')).toEqual({ datum: '2026-05-31', water_diep: 1000 });
    });

    it('geeft een leeg object terug als er geen rij is', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getVerbruik('2026-05-31')).toEqual({});
    });
});

describe('getVorigeVerbruik', () => {
    it('vraagt de gegevens van de dag ervoor op', async () => {
        pool.execute.mockResolvedValue(resultaat([{ water_diep: 900 }]));
        await repo.getVorigeVerbruik('2026-05-31');
        expect(paramsVan(pool.execute)).toEqual(['2026-05-30']);
    });

    it('rekent correct over een maandgrens heen', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.getVorigeVerbruik('2026-06-01');
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31']);
    });
});

describe('saveVerbruik', () => {
    it('zet ontbrekende velden om naar null', async () => {
        await repo.saveVerbruik({ datum: '2026-05-31', water_diep: 1000 });
        const params = paramsVan(pool.execute);
        expect(params[0]).toBe('2026-05-31');
        expect(params[1]).toBeNull();   // floculant
        expect(params[2]).toBe(1000);   // water_diep
        expect(params[3]).toBeNull();   // water_ondiep
    });
});

describe('getVerwarming', () => {
    it('geeft een leeg object terug zonder rij', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getVerwarming('2026-05-31')).toEqual({});
    });
});

describe('saveVerwarming', () => {
    it('slaat de statusvelden op met null-fallback', async () => {
        await repo.saveVerwarming({ datum: '2026-05-31', verwarming_status_1: true });
        const params = paramsVan(pool.execute);
        expect(params[0]).toBe('2026-05-31');
        expect(params[1]).toBe(true);
        expect(params[2]).toBeNull();
    });
});
