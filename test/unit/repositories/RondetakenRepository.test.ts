import { Pool } from 'mysql2/promise';
import { RondetakenRepository } from '../../../backend/repositories/RondetakenRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: RondetakenRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new RondetakenRepository(pool as unknown as Pool);
});

const DATUM = '2026-05-31';

describe('CATALOGUS', () => {
    it('bevat de vijf belangrijke (kritieke) taken', () => {
        const kritiek = RondetakenRepository.CATALOGUS.filter(t => t.prioriteit === 'kritiek').map(t => t.sleutel);
        expect(kritiek).toEqual(
            expect.arrayContaining(['regelaar_diep', 'regelaar_ondiep', 'regelaar_peuterbad', 'filters_spraypark', 'douches_test']));
        expect(kritiek).toHaveLength(5);
    });

    it('heeft unieke sleutels', () => {
        const sleutels = RondetakenRepository.CATALOGUS.map(t => t.sleutel);
        expect(new Set(sleutels).size).toBe(sleutels.length);
    });

    it('koppelt elke taak aan een geldige bad-pagina', () => {
        expect(RondetakenRepository.CATALOGUS.every(t => t.pagina === 'grote-baden' || t.pagina === 'peuterbad')).toBe(true);
        expect(RondetakenRepository.CATALOGUS.find(t => t.sleutel === 'regelaar_peuterbad')!.pagina).toBe('peuterbad');
        expect(RondetakenRepository.CATALOGUS.find(t => t.sleutel === 'filters_spraypark')!.pagina).toBe('peuterbad');
    });

    it('isGeldigeSleutel onderscheidt bekende en onbekende sleutels', () => {
        expect(RondetakenRepository.isGeldigeSleutel('regelaar_diep')).toBe(true);
        expect(RondetakenRepository.isGeldigeSleutel('bestaat_niet')).toBe(false);
    });
});

describe('getRondetaken', () => {
    it('geeft de volledige catalogus terug, allemaal onvoltooid zonder voltooiingen', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        const taken = await repo.getRondetaken(DATUM);
        expect(taken).toHaveLength(RondetakenRepository.CATALOGUS.length);
        expect(taken.every(t => t.voltooid === false)).toBe(true);
        expect(paramsVan(pool.execute)).toEqual([DATUM]);
    });

    it('markeert taken met een voltooiing als voltooid + metadata', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { taak_sleutel: 'regelaar_diep', voltooid_op: '2026-05-31T09:30', voltooid_door: 'Jan' },
        ]));
        const taken = await repo.getRondetaken(DATUM);
        const diep = taken.find(t => t.sleutel === 'regelaar_diep')!;
        expect(diep.voltooid).toBe(true);
        expect(diep.voltooid_door).toBe('Jan');
        expect(taken.find(t => t.sleutel === 'diep_filter')!.voltooid).toBe(false);
    });
});

describe('voltooi', () => {
    it('schrijft een upsert weg voor een geldige sleutel', async () => {
        await repo.voltooi('regelaar_diep', DATUM, 'Jan');
        expect(sqlVan(pool.execute)).toMatch(/INSERT INTO rondetaken_voltooid/i);
        expect(paramsVan(pool.execute)).toEqual(['regelaar_diep', DATUM, 'Jan']);
    });

    it('negeert een onbekende sleutel (geen DB-schrijfactie)', async () => {
        await repo.voltooi('bestaat_niet', DATUM, 'Jan');
        expect(pool.execute).not.toHaveBeenCalled();
    });
});

describe('heropen', () => {
    it('verwijdert de voltooiing voor die dag', async () => {
        await repo.heropen('regelaar_diep', DATUM);
        expect(sqlVan(pool.execute)).toMatch(/DELETE FROM rondetaken_voltooid/i);
        expect(paramsVan(pool.execute)).toEqual(['regelaar_diep', DATUM]);
    });
});
