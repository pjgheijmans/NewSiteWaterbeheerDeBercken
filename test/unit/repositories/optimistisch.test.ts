import { Pool } from 'mysql2/promise';
import { optimistischOpslaan, CONFLICT_BERICHT } from '../../../backend/repositories/optimistisch';
import { AppError } from '../../../backend/errors';
import { maakMockPool, resultaat, sqlVan, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
beforeEach(() => {
    pool = maakMockPool();
});

const opslaan = (auteur: string | null, verwachteVersie: number | null) =>
    optimistischOpslaan(
        pool as unknown as Pool,
        'metingen_diep_ondiep',
        { bad_id: 1, datum: '2026-05-31' },
        { ph_waarde: 7.2, flow: 300 },
        auteur,
        verwachteVersie,
    );

const META = (versie: number) =>
    resultaat([{ versie, auteur: 'Jan', bijgewerkt_op: '2026-05-31T10:00:00' }]);

describe('optimistischOpslaan', () => {
    it('bestaand record, versie matcht → UPDATE en nieuwe meta terug', async () => {
        pool.execute
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // conditionele UPDATE matcht
            .mockResolvedValueOnce(META(3)); // leesMeta
        const res = await opslaan('Jan', 2);

        expect(res).toEqual({ versie: 3, auteur: 'Jan', bijgewerkt_op: '2026-05-31T10:00:00' });
        // Eerste call is de conditionele UPDATE met versie+1 op de verwachte versie.
        expect(sqlVan(pool.execute, 0)).toContain('UPDATE metingen_diep_ondiep');
        expect(sqlVan(pool.execute, 0)).toContain('versie = versie + 1');
        const p = paramsVan(pool.execute, 0);
        expect(p[0]).toBe(7.2); // veldwaarden
        expect(p).toContain('Jan'); // auteur
        expect(p[p.length - 1]).toBe(2); // verwachte versie in WHERE
        // Géén INSERT op de happy-update.
        expect(pool.execute).toHaveBeenCalledTimes(2);
    });

    it('nieuw record (verwachteVersie null) → UPDATE mist, INSERT, meta terug', async () => {
        pool.execute
            .mockResolvedValueOnce([{ affectedRows: 0 }, []]) // UPDATE mist
            .mockResolvedValueOnce(resultaat([])) // bestaat niet
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // INSERT
            .mockResolvedValueOnce(META(1)); // leesMeta
        const res = await opslaan('Jan', null);

        expect(res.versie).toBe(1);
        expect(sqlVan(pool.execute, 2)).toContain('INSERT INTO metingen_diep_ondiep');
    });

    it('bestaand record met andere versie → 409 conflict (geen INSERT)', async () => {
        pool.execute
            .mockResolvedValueOnce([{ affectedRows: 0 }, []]) // UPDATE mist (versie verschilt)
            .mockResolvedValueOnce(resultaat([{ versie: 5 }])); // record bestaat wél
        await expect(opslaan('Jan', 2)).rejects.toMatchObject({
            status: 409,
            message: CONFLICT_BERICHT,
        });
        expect(pool.execute).toHaveBeenCalledTimes(2); // geen INSERT
    });

    it('client verwachtte een versie maar het record is weg → 409', async () => {
        pool.execute
            .mockResolvedValueOnce([{ affectedRows: 0 }, []])
            .mockResolvedValueOnce(resultaat([])); // bestaat niet
        await expect(opslaan('Jan', 2)).rejects.toBeInstanceOf(AppError);
        await expect(opslaan('Jan', 2)).rejects.toMatchObject({ status: 409 });
    });

    it('gelijktijdige insert (duplicate key) → 409', async () => {
        pool.execute
            .mockResolvedValueOnce([{ affectedRows: 0 }, []])
            .mockResolvedValueOnce(resultaat([]))
            .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
        await expect(opslaan('Jan', null)).rejects.toMatchObject({ status: 409 });
    });

    it('onverwachte DB-fout wordt doorgegooid (niet als 409)', async () => {
        pool.execute.mockRejectedValueOnce(new Error('verbinding kwijt'));
        await expect(opslaan('Jan', 1)).rejects.toThrow('verbinding kwijt');
    });
});
