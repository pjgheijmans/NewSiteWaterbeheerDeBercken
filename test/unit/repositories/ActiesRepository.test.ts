import { Pool } from 'mysql2/promise';
import { ActiesRepository } from '../../../backend/repositories/ActiesRepository';
import { ActieTekstenRepository } from '../../../backend/repositories/ActieTekstenRepository';
import { IActieTekstenRepository } from '../../../backend/repositories/IActieTekstenRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: ActiesRepository;
let actieTekstenRepo: jest.Mocked<IActieTekstenRepository>;

// Standaard-sjablonen als sleutel→sjabloon-map (zonder DB) voor de mock-repo.
const standaardSjablonen: Record<string, string> = {};
new ActieTekstenRepository({} as unknown as Pool).getDefaults()
    .forEach(t => { standaardSjablonen[t.actie_sleutel] = t.sjabloon; });

beforeEach(() => {
    pool = maakMockPool();
    actieTekstenRepo = {
        getAll: jest.fn(), getDefaults: jest.fn(), save: jest.fn(), seedDefaults: jest.fn(),
        getSjablonen: jest.fn().mockResolvedValue(standaardSjablonen),
    };
    repo = new ActiesRepository(pool as unknown as Pool, actieTekstenRepo);
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

describe('filter_spoelen ↔ rondetaak koppeling', () => {
    it('resolveFilterSpoelen resolved alle open filter_spoelen-acties van een bad', async () => {
        await repo.resolveFilterSpoelen('Diep', '2026-05-31', 'Jan');
        expect(sqlVan(pool.execute)).toMatch(/opgelost = TRUE/i);
        expect(sqlVan(pool.execute)).toMatch(/filter_spoelen%/i);
        expect(paramsVan(pool.execute)).toEqual(['Jan', 'Diep', '2026-05-31']);
    });

    it('unresolveFilterSpoelen heropent de filter_spoelen-acties van een bad', async () => {
        await repo.unresolveFilterSpoelen('Ondiep', '2026-05-31');
        expect(sqlVan(pool.execute)).toMatch(/opgelost = FALSE/i);
        expect(sqlVan(pool.execute)).toMatch(/filter_spoelen%/i);
        expect(paramsVan(pool.execute)).toEqual(['Ondiep', '2026-05-31']);
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

    it('hanteert een aparte flow-drempel per bad: dezelfde flow triggert Diep wel, Ondiep niet', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        // Diep: flow 100 < 250 → actie
        await repo.genereer(1, '2026-05-31', 'Diep', { datum: '2026-05-31', bad_naam: 'Diep', flow: 100 } as any);
        expect(sqlVan(pool.execute, 1)).toMatch(/INSERT INTO acties/i);
        expect(paramsVan(pool.execute, 1)[3]).toBe('filter_spoelen_flow');

        pool.execute.mockClear();
        // Ondiep: flow 100 >= 75 → geen actie (DELETE)
        await repo.genereer(2, '2026-05-31', 'Ondiep', { datum: '2026-05-31', bad_naam: 'Ondiep', flow: 100 } as any);
        expect(sqlVan(pool.execute, 1)).toMatch(/DELETE FROM acties/i);
        expect(paramsVan(pool.execute, 1)).toEqual([2, '2026-05-31', 'filter_spoelen_flow']);
    });
});

describe('genereer — Peuterbad meetwaarden', () => {
    it('maakt filterdruk- (>1.0) en flow-acties (<4) aan op de peuterbad-drempels', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(3, '2026-05-31', 'Peuterbad', {
            datum: '2026-05-31', bad_naam: 'Peuterbad',
            filter_druk_in: 1.5, // > 1.0 → actie
            flow: 2,             // < 4  → actie
        } as any);
        const drukCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'filter_spoelen_druk');
        const flowCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'filter_spoelen_flow');
        expect(String(drukCall![0])).toMatch(/INSERT INTO acties/i);
        expect(String(flowCall![0])).toMatch(/INSERT INTO acties/i);
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

    it('maakt zwavelzuur- (<50) en floculant-acties (<10) aan onder hun drempels', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))            // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 1 }]))   // SELECT id FROM baden 'Diep'
            .mockResolvedValue(resultaat([]));
        await repo.genereerVerbruik('2026-05-31', {
            datum: '2026-05-31', chemicalien_zwavelzuur: 30, floculant: 5,
        } as any);
        const zwavelCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'zwavelzuur_bestellen');
        const flocCall   = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'floculant_bijvullen');
        expect(String(zwavelCall![0])).toMatch(/INSERT INTO acties/i);
        expect(String(flocCall![0])).toMatch(/INSERT INTO acties/i);
    });
});

describe('genereerBezoekers', () => {
    it('doet niets bij een niet-numeriek bezoekersaantal', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereerBezoekers('2026-05-31', null);
        // alleen laadDrempelwaarden, geen baden-query
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('maakt een bezoekers-actie aan voor zowel Diep als Ondiep boven de drempel (750)', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                                   // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }, { id: 2, naam: 'Ondiep' }])) // baden
            .mockResolvedValue(resultaat([]));
        await repo.genereerBezoekers('2026-05-31', 800); // > 750
        const diepCall   = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'filter_spoelen_bezoekers' && c[1][0] === 1);
        const ondiepCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'filter_spoelen_bezoekers' && c[1][0] === 2);
        expect(String(diepCall![0])).toMatch(/INSERT INTO acties/i);
        expect(String(ondiepCall![0])).toMatch(/INSERT INTO acties/i);
    });
});

describe('genereerSpoelbeurt', () => {
    it('berekent totalen per bad en triggert een actie boven de drempel', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                  // laadDrempelwaarden → spoelbeurt_max 1500
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }, { id: 2, naam: 'Ondiep' }])) // baden
            .mockResolvedValueOnce(resultaat([{ anker: null, dagen: null }]))      // Diep: anker (geen reiniging)
            .mockResolvedValueOnce(resultaat([{ totaal: '2000' }]))                // Diep: totaal 2000 > 1500
            .mockResolvedValueOnce(resultaat([]))                                  // Diep: stelIn spoelbeurt
            .mockResolvedValueOnce(resultaat([]))                                  // Diep: stelIn dagen
            .mockResolvedValueOnce(resultaat([{ anker: null, dagen: null }]))      // Ondiep: anker (geen reiniging)
            .mockResolvedValueOnce(resultaat([{ totaal: '500' }]))                 // Ondiep: totaal 500 < 1500
            .mockResolvedValueOnce(resultaat([]))                                  // Ondiep: stelIn spoelbeurt
            .mockResolvedValueOnce(resultaat([]));                                 // Ondiep: stelIn dagen

        const totalen = await repo.genereerSpoelbeurt('2026-05-31');
        expect(totalen).toEqual({ diep: 2000, ondiep: 500 });
    });

    it('telt per bad onafhankelijk: Diep reset op zijn eigen spoelbeurt, Ondiep telt door', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                                   // laadDrempelwaarden → max 1500, dagen 7
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }, { id: 2, naam: 'Ondiep' }])) // baden
            .mockResolvedValueOnce(resultaat([{ anker: '2026-05-20', dagen: 11 }]))                 // Diep: eigen anker
            .mockResolvedValueOnce(resultaat([{ totaal: '800' }]))                                  // Diep: 800 sinds reset < 1500
            .mockResolvedValueOnce(resultaat([]))                                                   // Diep: stelIn spoelbeurt DELETE
            .mockResolvedValueOnce(resultaat([]))                                                   // Diep: stelIn dagen
            .mockResolvedValueOnce(resultaat([{ anker: null, dagen: null }]))                       // Ondiep: GEEN anker
            .mockResolvedValueOnce(resultaat([{ totaal: '2000' }]))                                 // Ondiep: 2000 (alles) > 1500
            .mockResolvedValueOnce(resultaat([]))                                                   // Ondiep: stelIn spoelbeurt INSERT
            .mockResolvedValueOnce(resultaat([]));                                                  // Ondiep: stelIn dagen

        const totalen = await repo.genereerSpoelbeurt('2026-05-31');

        // Aparte tellers → aparte uitkomsten
        expect(totalen).toEqual({ diep: 800, ondiep: 2000 });

        // Diep telt met ZIJN bad_id + filter-rondetaaksleutel en reset-venster (datum > anker)
        expect(paramsVan(pool.execute, 2)).toEqual(['2026-05-31', 1, '2026-05-31', 'diep_filter', '2026-05-31']);
        expect(sqlVan(pool.execute, 3)).toMatch(/datum > \? AND datum <= \?/i);
        expect(paramsVan(pool.execute, 3)).toEqual(['2026-05-20', '2026-05-31']);
        expect(sqlVan(pool.execute, 4)).toMatch(/DELETE FROM acties/i); // Diep < drempel → geen actie

        // Ondiep telt met ZIJN bad_id + sleutel en zonder reset (geen anker)
        expect(paramsVan(pool.execute, 6)).toEqual(['2026-05-31', 2, '2026-05-31', 'ondiep_filter', '2026-05-31']);
        expect(sqlVan(pool.execute, 7)).not.toMatch(/datum > \?/i);
        expect(paramsVan(pool.execute, 7)).toEqual(['2026-05-31']);
        expect(sqlVan(pool.execute, 8)).toMatch(/INSERT INTO acties/i); // Ondiep > drempel → actie
        expect(paramsVan(pool.execute, 8)[3]).toBe('filter_spoelen_spoelbeurt');
    });

    it('betrekt de filter-rondetaak in het ankerpunt (meest recente reiniging telt)', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                  // laadDrempelwaarden → max 1500
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }]))           // baden (alleen Diep)
            .mockResolvedValueOnce(resultaat([{ anker: '2026-05-25', dagen: 6 }])) // Diep: anker = rondetaak (recenter dan actie)
            .mockResolvedValueOnce(resultaat([{ totaal: '300' }]))                 // Diep: 300 sinds 25e
            .mockResolvedValueOnce(resultaat([]))                                  // Diep: stelIn spoelbeurt DELETE
            .mockResolvedValueOnce(resultaat([]));                                 // Diep: stelIn dagen

        await repo.genereerSpoelbeurt('2026-05-31');

        // De ankerquery kijkt naar zowel de opgeloste spoelbeurt-actie als de filter-rondetaak
        expect(sqlVan(pool.execute, 2)).toMatch(/rondetaken_voltooid/i);
        expect(sqlVan(pool.execute, 2)).toMatch(/filter_spoelen_spoelbeurt/i);
        expect(paramsVan(pool.execute, 2)).toEqual(['2026-05-31', 1, '2026-05-31', 'diep_filter', '2026-05-31']);
        // Telt vanaf het (meest recente) ankerpunt
        expect(paramsVan(pool.execute, 3)).toEqual(['2026-05-25', '2026-05-31']);
    });
});

describe('genereer — Peuterbad chemicaliën', () => {
    it('maakt een chloor-bijvul-actie aan onder de peuterbad-drempel (10)', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(3, '2026-05-31', 'Peuterbad', {
            datum: '2026-05-31', bad_naam: 'Peuterbad', chemicalien_chloor: 8, // < 10 → actief
        } as any);
        const chloorCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'chloor_peuterbad_bijvullen');
        expect(chloorCall).toBeDefined();
        expect(String(chloorCall![0])).toMatch(/INSERT INTO acties/i);
    });

    it('verwijdert de zwavelzuur-bijvul-actie boven de peuterbad-drempel (5)', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.genereer(3, '2026-05-31', 'Peuterbad', {
            datum: '2026-05-31', bad_naam: 'Peuterbad', chemicalien_zwavelzuur: 9, // >= 5 → inactief
        } as any);
        const zwavelCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][2] === 'zwavelzuur_peuterbad_bijvullen');
        expect(zwavelCall).toBeDefined();
        expect(String(zwavelCall![0])).toMatch(/DELETE FROM acties/i);
    });
});

describe('genereerCoordinatoren', () => {
    it('maakt een gebonden-chloor-actie aan boven de drempel en een peuterbad-aftap-actie als gebruikt', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                              // laadDrempelwaarden → gebonden_max 1
            .mockResolvedValueOnce(resultaat([{ id: 3, naam: 'Peuterbad' }]))                  // baden
            .mockResolvedValueOnce(resultaat([{ gebonden_max: '1.50', gebruikt: 1 }]))         // aggregatie Peuterbad
            .mockResolvedValue(resultaat([]));                                                 // stelIn calls

        await repo.genereerCoordinatoren('2026-05-31');

        const gebondenCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'filter_spoelen_gebonden');
        expect(gebondenCall).toBeDefined();
        expect(String(gebondenCall![0])).toMatch(/INSERT INTO acties/i);

        const aftapCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][3] === 'peuterbad_aftappen');
        expect(aftapCall).toBeDefined();
        expect(String(aftapCall![0])).toMatch(/INSERT INTO acties/i);
    });

    it('verwijdert de gebonden-chloor-actie als de waarde onder de drempel ligt', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                              // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }]))                       // baden
            .mockResolvedValueOnce(resultaat([{ gebonden_max: '0.40', gebruikt: null }]))      // aggregatie Diep
            .mockResolvedValue(resultaat([]));

        await repo.genereerCoordinatoren('2026-05-31');

        const gebondenCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][2] === 'filter_spoelen_gebonden');
        expect(gebondenCall).toBeDefined();
        expect(String(gebondenCall![0])).toMatch(/DELETE FROM acties/i);
    });

    it('verwijdert de peuterbad-aftap-actie als het bad niet is gebruikt', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                          // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 3, naam: 'Peuterbad' }]))              // baden
            .mockResolvedValueOnce(resultaat([{ gebonden_max: '0.10', gebruikt: 0 }]))     // aggregatie
            .mockResolvedValue(resultaat([]));
        await repo.genereerCoordinatoren('2026-05-31');
        const aftapCall = pool.execute.mock.calls.find(c => Array.isArray(c[1]) && c[1][2] === 'peuterbad_aftappen');
        expect(aftapCall).toBeDefined();
        expect(String(aftapCall![0])).toMatch(/DELETE FROM acties/i);
    });

    it('genereert gebonden-chloor voor elk bad maar aftappen uitsluitend voor Peuterbad', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([]))                                          // laadDrempelwaarden
            .mockResolvedValueOnce(resultaat([{ id: 1, naam: 'Diep' }, { id: 2, naam: 'Ondiep' }, { id: 3, naam: 'Peuterbad' }]))
            .mockResolvedValue(resultaat([{ gebonden_max: '0.50', gebruikt: 0 }]));        // aggregaties + stelIn

        await repo.genereerCoordinatoren('2026-05-31');

        const gebondenCalls = pool.execute.mock.calls.filter(c => Array.isArray(c[1]) &&
            (c[1][2] === 'filter_spoelen_gebonden' || c[1][3] === 'filter_spoelen_gebonden'));
        const aftapCalls = pool.execute.mock.calls.filter(c => Array.isArray(c[1]) &&
            (c[1][2] === 'peuterbad_aftappen' || c[1][3] === 'peuterbad_aftappen'));
        expect(gebondenCalls).toHaveLength(3); // Diep, Ondiep, Peuterbad
        expect(aftapCalls).toHaveLength(1);    // alleen Peuterbad
    });
});
