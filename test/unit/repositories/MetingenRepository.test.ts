import { Pool } from 'mysql2/promise';
import { MetingenRepository } from '../../../backend/repositories/MetingenRepository';
import { AppError } from '../../../backend/errors';
import { maakMockPool, resultaat, sqlVan, paramsVan, MockPool } from '../../helpers/mockPool';

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

// Happy-update pad scripten: conditionele UPDATE matcht, daarna leest leesMeta de nieuwe meta.
function scriptHappyUpdate() {
    pool.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockResolvedValueOnce(resultaat([{ versie: 1, auteur: 'Jan', bijgewerkt_op: '2026-05-31T10:00:00' }]));
}

describe('savePeuterbadMeting', () => {
    it('mapt de meetvelden + auteur + verwachte versie naar de conditionele UPDATE', async () => {
        scriptHappyUpdate();
        const res = await repo.savePeuterbadMeting(3, { datum: '2026-05-31', bad_naam: 'Peuterbad', ph_waarde: 7.0 }, 'Jan', 2);
        expect(res).toEqual({ versie: 1, auteur: 'Jan', bijgewerkt_op: '2026-05-31T10:00:00' });

        expect(sqlVan(pool.execute, 0)).toContain('UPDATE metingen_peuterbad');
        const p = paramsVan(pool.execute, 0); // [ph, chloor, flow, filter_druk_in, water, chem_chloor, chem_zwavel, auteur, bad_id, datum, verwachteVersie]
        expect(p[0]).toBe(7.0);
        expect(p[1]).toBeNull();              // chloor ontbreekt
        expect(p[2]).toBeNull();              // flow ontbreekt
        expect(p).toContain('Jan');
        expect(p[8]).toBe(3);                 // bad_id (sleutel)
        expect(p[9]).toBe('2026-05-31');      // datum (sleutel)
        expect(p[10]).toBe(2);                // verwachte versie in WHERE
    });

    it('gebruikt filter_druk als filter_druk_in ontbreekt', async () => {
        scriptHappyUpdate();
        await repo.savePeuterbadMeting(3, { datum: '2026-05-31', bad_naam: 'Peuterbad', filter_druk: 0.8 }, 'Jan', null);
        expect(paramsVan(pool.execute, 0)[3]).toBe(0.8); // filter_druk ?? filter_druk_in ?? null
    });
});

describe('saveGrootBadMeting', () => {
    it('zet alle ontbrekende meetwaarden om naar null in de UPDATE', async () => {
        scriptHappyUpdate();
        await repo.saveGrootBadMeting(1, { datum: '2026-05-31', bad_naam: 'Diep' }, 'Jan', null);
        expect(sqlVan(pool.execute, 0)).toContain('UPDATE metingen_diep_ondiep');
        const p = paramsVan(pool.execute, 0);
        expect(p.slice(0, 7)).toEqual([null, null, null, null, null, null, null]); // de 7 meetvelden
        expect(p[8]).toBe(1);            // bad_id
        expect(p[9]).toBe('2026-05-31'); // datum
    });
});
