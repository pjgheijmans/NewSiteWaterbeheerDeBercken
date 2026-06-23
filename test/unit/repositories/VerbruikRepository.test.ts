import { Pool } from 'mysql2/promise';
import { VerbruikRepository } from '../../../backend/repositories/VerbruikRepository';
import { maakMockPool, resultaat, sqlVan, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: VerbruikRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new VerbruikRepository(pool as unknown as Pool);
});

describe('getVerbruik', () => {
    it('geeft de eerste rij terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ datum: '2026-05-31', water_diep: 1000 }]));
        expect(await repo.getVerbruik('2026-05-31')).toEqual({
            datum: '2026-05-31',
            water_diep: 1000,
        });
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

// Happy-update pad: conditionele UPDATE matcht, daarna leesMeta.
function scriptHappyUpdate() {
    pool.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockResolvedValueOnce(resultaat([{ versie: 1, auteur: 'Jan', bijgewerkt_op: null }]));
}

describe('saveVerbruik', () => {
    it('mapt de velden + auteur + verwachte versie naar de conditionele UPDATE', async () => {
        scriptHappyUpdate();
        const res = await repo.saveVerbruik({ datum: '2026-05-31', water_diep: 1000 }, 'Jan', 4);
        expect(res).toEqual({ versie: 1, auteur: 'Jan', bijgewerkt_op: null });

        expect(sqlVan(pool.execute, 0)).toContain('UPDATE verbruik_diep_ondiep');
        const p = paramsVan(pool.execute, 0); // [floculant, water_diep, ..., auteur, datum, verwachteVersie]
        expect(p[0]).toBeNull(); // floculant ontbreekt
        expect(p[1]).toBe(1000); // water_diep
        expect(p[2]).toBeNull(); // water_ondiep
        expect(p).toContain('Jan');
        expect(p[p.length - 1]).toBe(4); // verwachte versie
    });
});

describe('getVerwarming', () => {
    it('geeft een leeg object terug zonder rij', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getVerwarming('2026-05-31')).toEqual({});
    });
});

describe('saveVerwarming', () => {
    it('normaliseert de statusvelden naar 0/1 in de UPDATE', async () => {
        scriptHappyUpdate();
        await repo.saveVerwarming({ datum: '2026-05-31', verwarming_status_1: true }, 'Jan', null);
        expect(sqlVan(pool.execute, 0)).toContain('UPDATE verwarmings_systeem_diep_ondiep');
        const p = paramsVan(pool.execute, 0);
        expect(p[0]).toBe(1); // status_1 = true → 1
        expect(p[1]).toBe(0); // status_2 ontbreekt → 0
    });
});
