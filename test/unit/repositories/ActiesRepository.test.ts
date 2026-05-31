import { Pool } from 'mysql2/promise';
import { ActiesRepository } from '../../../backend/repositories/ActiesRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: ActiesRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new ActiesRepository(pool as unknown as Pool);
});

describe('getActies', () => {
    it('geeft de acties voor een datum terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1, actie_type: 'filter_spoelen_druk' }]));
        const acties = await repo.getActies('2026-05-31');
        expect(acties).toHaveLength(1);
        expect(paramsVan(pool.execute)).toEqual(['2026-05-31']);
    });
});

describe('resolve / unresolve', () => {
    it('resolve zet opgelost = TRUE met opgelost_door', async () => {
        await repo.resolve('5', 'Test User');
        expect(sqlVan(pool.execute)).toMatch(/opgelost = TRUE/i);
        expect(paramsVan(pool.execute)).toEqual(['Test User', '5']);
    });

    it('unresolve zet opgelost = FALSE en wist metadata', async () => {
        await repo.unresolve('5');
        expect(sqlVan(pool.execute)).toMatch(/opgelost = FALSE/i);
        expect(paramsVan(pool.execute)).toEqual(['5']);
    });
});

describe('genereer — Diep/Ondiep drempelwaarden', () => {
    it('maakt een filterdruk-actie aan als het verschil de drempel overschrijdt', async () => {
        // call 0 = laadDrempelwaarden SELECT → leeg → defaults (druk_verschil 0.40)
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(1, '2026-05-31', 'Diep', {
            datum: '2026-05-31', bad_naam: 'Diep',
            filter_druk_in: 1.0, filter_druk_uit: 0.5, // verschil 0.5 > 0.40
            flow: 300,                                   // 300 >= 250 → geen flow-actie
        } as any);
        // call 1 = stelIn INSERT filter_spoelen_druk (actief)
        expect(sqlVan(pool.execute, 1)).toMatch(/INSERT INTO acties/i);
        expect(paramsVan(pool.execute, 1)[3]).toBe('filter_spoelen_druk');
    });

    it('verwijdert de filterdruk-actie als het verschil onder de drempel ligt', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(1, '2026-05-31', 'Diep', {
            datum: '2026-05-31', bad_naam: 'Diep',
            filter_druk_in: 0.6, filter_druk_uit: 0.5, // verschil 0.1 < 0.40 → inactief
            flow: 300,
        } as any);
        // call 1 = stelIn DELETE (inactief)
        expect(sqlVan(pool.execute, 1)).toMatch(/DELETE FROM acties/i);
        expect(paramsVan(pool.execute, 1)).toEqual([1, '2026-05-31', 'filter_spoelen_druk']);
    });

    it('maakt een flow-actie aan als de flow onder de minimum (Diep=250) ligt', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(1, '2026-05-31', 'Diep', {
            datum: '2026-05-31', bad_naam: 'Diep', flow: 200, // < 250 → actief
        } as any);
        // alleen flow aanwezig → call 1 = flow-actie INSERT
        expect(paramsVan(pool.execute, 1)[3]).toBe('filter_spoelen_flow');
        expect(sqlVan(pool.execute, 1)).toMatch(/INSERT INTO acties/i);
    });
});

describe('genereerVerbruik', () => {
    it('maakt een chloor-bestel-actie aan onder de voorraaddrempel', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))            // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 1 }]))   // SELECT id FROM baden 'Diep'
            .mockResolvedValue(resultaat([]));               // stelIn calls
        await repo.genereerVerbruik('2026-05-31', {
            datum: '2026-05-31', chemicalien_chloor: 100, // < 200 → actief
        } as any);
        // Eerste stelIn na de baden-query
        const chloorCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'chloor_bestellen');
        expect(chloorCall).toBeDefined();
    });

    it('doet niets als bad "Diep" niet bestaat', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))   // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([]));  // SELECT baden → leeg
        await repo.genereerVerbruik('2026-05-31', { datum: '2026-05-31', chemicalien_chloor: 100 } as any);
        expect(pool.execute).toHaveBeenCalledTimes(2); // stopt na lege baden-query
    });
});

describe('genereerBezoekers', () => {
    it('doet niets bij een niet-numeriek bezoekersaantal', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereerBezoekers('2026-05-31', null);
        // alleen laadDrempelwaarden, geen baden-query
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });
});

describe('genereerSpoelbeurt', () => {
    it('berekent totalen per bad en triggert een actie boven de drempel', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                  // laadDrempelwaarden → spoelbeurt_max 1500
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }, { id: 2, naam: 'Ondiep' }])) // baden
            .mockResolvedValueOnce(resultaat([]))                                  // Diep: lastClean leeg
            .mockResolvedValueOnce(resultaat([{ totaal: '2000' }]))                // Diep: totaal 2000 > 1500
            .mockResolvedValueOnce(resultaat([]))                                  // Diep: stelIn INSERT
            .mockResolvedValueOnce(resultaat([]))                                  // Ondiep: lastClean leeg
            .mockResolvedValueOnce(resultaat([{ totaal: '500' }]))                 // Ondiep: totaal 500 < 1500
            .mockResolvedValueOnce(resultaat([]));                                 // Ondiep: stelIn DELETE

        const totalen = await repo.genereerSpoelbeurt('2026-05-31');
        expect(totalen).toEqual({ diep: 2000, ondiep: 500 });
    });
});
