import { Pool } from 'mysql2/promise';
import { CoordinatorenRepository } from '../../../backend/repositories/CoordinatorenRepository';
import { AppError } from '../../../backend/errors';
import { maakMockPool, resultaat, paramsVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: CoordinatorenRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new CoordinatorenRepository(pool as unknown as Pool);
});

describe('getCoordinatoren — groepering per tijdstip', () => {
    it('groepeert rijen met hetzelfde tijdstip in één blok', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { bad_naam: 'Diep',   tijdstip: '10:00:00', auteur: 'A', ph_waarde: 7.2 },
            { bad_naam: 'Ondiep', tijdstip: '10:00:00', auteur: 'A', ph_waarde: 7.1 },
            { bad_naam: 'Diep',   tijdstip: '14:00:00', auteur: 'B', ph_waarde: 7.3 },
        ]));
        const blokken = await repo.getCoordinatoren('2026-05-31');
        expect(blokken).toHaveLength(2);
        expect(blokken[0].tijdstip).toBe('10:00:00');
        expect(blokken[0].auteur).toBe('A');
        expect(blokken[0].metingen).toHaveLength(2);
        expect(blokken[1].tijdstip).toBe('14:00:00');
        expect(blokken[1].metingen).toHaveLength(1);
    });

    it('valt terug op lege auteur als die null is', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { bad_naam: 'Diep', tijdstip: '10:00:00', auteur: null, ph_waarde: 7.2 },
        ]));
        const blokken = await repo.getCoordinatoren('2026-05-31');
        expect(blokken[0].auteur).toBe('');
    });

    it('geeft een lege array terug zonder rijen', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getCoordinatoren('2026-05-31')).toEqual([]);
    });
});

describe('getBadId', () => {
    it('gooit AppError 400 als het bad niet bestaat', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await expect(repo.getBadId('Onbekend')).rejects.toMatchObject({ status: 400 });
    });
});

describe('saveMeting', () => {
    it('gebruikt 00:00:00 als tijdstip ontbreekt', async () => {
        await repo.saveMeting(1, { datum: '2026-05-31', bad_naam: 'Diep' }, 'Auteur');
        const params = paramsVan(pool.execute);
        expect(params[2]).toBe('00:00:00');
        expect(params[3]).toBe('Auteur');
    });
});

describe('getChecklist', () => {
    it('geeft standaardwaarden (alles 0) terug zonder rij', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getChecklist('2026-05-31')).toEqual({
            proef_waterspeel: 0, proef_spraypark: 0, proef_douches: 0, proef_glijbaan: 0, auteur: null,
        });
    });
});

describe('saveChecklist', () => {
    it('zet booleans om naar 1/0', async () => {
        await repo.saveChecklist('2026-05-31', {
            proef_waterspeel: true, proef_spraypark: false, proef_douches: true, proef_glijbaan: false,
        }, 'Co Ord');
        const params = paramsVan(pool.execute);
        expect(params).toEqual(['2026-05-31', 1, 0, 1, 0, 'Co Ord']);
    });
});

describe('getDaggegevens', () => {
    it('geeft null-defaults terug zonder rij', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.getDaggegevens('2026-05-31')).toEqual({
            lucht_temperatuur: null, bezoekers_vandaag: null, bezoekers_totaal_spoelbeurt: null, auteur: null,
        });
    });
});
