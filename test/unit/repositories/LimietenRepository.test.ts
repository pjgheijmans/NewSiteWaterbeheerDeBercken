import { Pool } from 'mysql2/promise';
import { LimietenRepository } from '../../../backend/repositories/LimietenRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: LimietenRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new LimietenRepository(pool as unknown as Pool);
});

describe('getAll — normalisatie van aliassen', () => {
    it('zet min/max om naar floats', async () => {
        pool.execute.mockResolvedValue(
            resultaat([{ parameter_naam: 'ph_waarde', min_waarde: '6.80', max_waarde: '7.60' }]),
        );
        const map = await repo.getAll();
        expect(map['ph_waarde']).toEqual({ min: 6.8, max: 7.6 });
    });

    it('splitst oude "flow" uit naar flow_diep/ondiep/peuterbad', async () => {
        pool.execute.mockResolvedValue(
            resultaat([{ parameter_naam: 'flow', min_waarde: '50', max_waarde: '200' }]),
        );
        const map = await repo.getAll();
        expect(map['flow_diep']).toEqual({ min: 50, max: 200 });
        expect(map['flow_ondiep']).toEqual({ min: 50, max: 200 });
        expect(map['flow_peuterbad']).toEqual({ min: 50, max: 200 });
        // De oude alias is verwijderd
        expect(map['flow']).toBeUndefined();
    });

    it('mapt oude "temperatuur" naar watertemperatuur', async () => {
        pool.execute.mockResolvedValue(
            resultaat([{ parameter_naam: 'temperatuur', min_waarde: '20', max_waarde: '30' }]),
        );
        const map = await repo.getAll();
        expect(map['watertemperatuur']).toEqual({ min: 20, max: 30 });
        expect(map['temperatuur']).toBeUndefined();
    });

    it('overschrijft bestaande flow_diep NIET met de alias', async () => {
        pool.execute.mockResolvedValue(
            resultaat([
                { parameter_naam: 'flow', min_waarde: '50', max_waarde: '200' },
                { parameter_naam: 'flow_diep', min_waarde: '250', max_waarde: '450' },
            ]),
        );
        const map = await repo.getAll();
        expect(map['flow_diep']).toEqual({ min: 250, max: 450 });
    });
});

describe('getDefaults', () => {
    it('geeft alle 36 standaardparameters synchroon terug', () => {
        const defaults = repo.getDefaults();
        expect(Object.keys(defaults)).toHaveLength(36);
        expect(defaults['ph_waarde']).toEqual({ min: 6.8, max: 7.6 });
        // getDefaults raakt de database niet aan
        expect(pool.execute).not.toHaveBeenCalled();
    });
});

describe('save', () => {
    it('slaat één limiet op met INSERT ... ON DUPLICATE KEY UPDATE', async () => {
        await repo.save({ parameter_naam: 'ph_waarde', min_waarde: 6.8, max_waarde: 7.6 });
        expect(sqlVan(pool.execute)).toMatch(/ON DUPLICATE KEY UPDATE/i);
        expect(paramsVan(pool.execute)).toEqual(['ph_waarde', 6.8, 7.6]);
    });
});

describe('seedDefaults', () => {
    it('voegt alle 36 standaardlimieten met INSERT IGNORE toe', async () => {
        await repo.seedDefaults();
        expect(pool.execute).toHaveBeenCalledTimes(36);
        expect(sqlVan(pool.execute)).toMatch(/INSERT IGNORE/i);
    });
});
