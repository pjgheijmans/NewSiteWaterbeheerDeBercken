import { Pool } from 'mysql2/promise';
import { ActieTekstenRepository } from '../../../backend/repositories/ActieTekstenRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: ActieTekstenRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new ActieTekstenRepository(pool as unknown as Pool);
});

describe('render — plaatshouders', () => {
    it('vult bekende plaatshouders in', () => {
        const tekst = ActieTekstenRepository.render(
            'Flow {bad} onder {drempel} m³/h — Filter spoelen', { bad: 'Diep', drempel: 250 });
        expect(tekst).toBe('Flow Diep onder 250 m³/h — Filter spoelen');
    });

    it('laat onbekende plaatshouders leeg', () => {
        expect(ActieTekstenRepository.render('Hoi {onbekend}!', {})).toBe('Hoi !');
    });

    it('laat tekst zonder plaatshouders ongewijzigd', () => {
        expect(ActieTekstenRepository.render('Peuterbad aftappen', {})).toBe('Peuterbad aftappen');
    });
});

describe('getDefaults', () => {
    it('geeft alle standaard-sjablonen synchroon terug zonder DB-toegang', () => {
        const defaults = repo.getDefaults();
        expect(defaults.length).toBe(13);
        expect(defaults.find(t => t.actie_sleutel === 'chloor_bestellen')).toBeDefined();
        expect(pool.execute).not.toHaveBeenCalled();
    });
});

describe('getAll — standaarden samengevoegd met overrides', () => {
    it('overschrijft een standaard met de DB-waarde', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { actie_sleutel: 'chloor_bestellen', sjabloon: 'Eigen tekst' },
        ]));
        const alle = await repo.getAll();
        expect(alle.find(t => t.actie_sleutel === 'chloor_bestellen')!.sjabloon).toBe('Eigen tekst');
        // Niet-overschreven sleutels behouden hun standaard
        expect(alle.find(t => t.actie_sleutel === 'peuterbad_aftappen')!.sjabloon)
            .toMatch(/Peuterbad/);
    });
});

describe('getSjablonen — sleutel→sjabloon map', () => {
    it('valt terug op de standaarden bij een lege DB', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        const map = await repo.getSjablonen();
        expect(map['filter_spoelen_flow']).toMatch(/Flow \{bad\}/);
    });

    it('gebruikt de DB-override waar aanwezig', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { actie_sleutel: 'filter_spoelen_flow', sjabloon: 'Aangepast {bad}' },
        ]));
        const map = await repo.getSjablonen();
        expect(map['filter_spoelen_flow']).toBe('Aangepast {bad}');
    });

    it('valt terug op de standaarden als de query faalt', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        pool.execute.mockRejectedValue(new Error('DB weg'));
        const map = await repo.getSjablonen();
        expect(map['chloor_bestellen']).toMatch(/Chloor bestellen/);
        (console.warn as jest.Mock).mockRestore();
    });
});

describe('save', () => {
    it('slaat één sjabloon op met INSERT ... ON DUPLICATE KEY UPDATE', async () => {
        await repo.save({ actie_sleutel: 'chloor_bestellen', sjabloon: 'Nieuwe tekst' });
        expect(sqlVan(pool.execute)).toMatch(/ON DUPLICATE KEY UPDATE/i);
        expect(paramsVan(pool.execute)).toEqual(['chloor_bestellen', 'Nieuwe tekst']);
    });
});

describe('seedDefaults', () => {
    it('voegt alle standaard-sjablonen met INSERT IGNORE toe', async () => {
        await repo.seedDefaults();
        expect(pool.execute).toHaveBeenCalledTimes(13);
        expect(sqlVan(pool.execute)).toMatch(/INSERT IGNORE/i);
    });
});
