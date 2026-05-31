import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../../../backend/repositories/GebruikersRepository';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: GebruikersRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new GebruikersRepository(pool as unknown as Pool);
});

describe('findByLogin', () => {
    it('geeft de gebruiker terug bij een match', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1, inlognaam: 'pheijmans', taak: 'waterbeheerder' }]));
        const g = await repo.findByLogin('pheijmans', 'Paul');
        expect(g).toMatchObject({ id: 1, taak: 'waterbeheerder' });
        expect(paramsVan(pool.execute)).toEqual(['pheijmans', 'Paul']);
    });

    it('geeft null terug zonder match', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.findByLogin('x', 'y')).toBeNull();
    });

    it('geeft het wachtwoord niet terug in de SELECT-lijst (alleen veilige velden)', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        await repo.findByLogin('x', 'y');
        // De SELECT-lijst (tussen SELECT en FROM) mag het wachtwoord niet bevatten;
        // in de WHERE-clausule mag het wel staan.
        const sql = sqlVan(pool.execute);
        const selectLijst = sql.slice(0, sql.indexOf('FROM'));
        expect(selectLijst).not.toMatch(/wachtwoord/i);
    });
});

describe('getAll', () => {
    it('geeft alle gebruikers terug', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1 }, { id: 2 }]));
        expect(await repo.getAll()).toHaveLength(2);
    });
});

describe('create', () => {
    it('voegt een gebruiker toe met de juiste parameters', async () => {
        await repo.create({ voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen', wachtwoord: 'x', taak: 'coordinator' });
        expect(paramsVan(pool.execute)).toEqual(['Jan', 'Jansen', 'jjansen', 'x', 'coordinator']);
    });
});

describe('update', () => {
    it('zet het id als laatste parameter', async () => {
        await repo.update('5', { voornaam: 'Jan', achternaam: 'J', inlognaam: 'jj', wachtwoord: 'x', taak: 'coordinator' });
        const params = paramsVan(pool.execute);
        expect(params[params.length - 1]).toBe('5');
    });
});

describe('remove', () => {
    it('verwijdert op id', async () => {
        await repo.remove('9');
        expect(paramsVan(pool.execute)).toEqual(['9']);
    });
});

describe('seedDefaults', () => {
    it('voegt beide standaardgebruikers met INSERT IGNORE toe', async () => {
        await repo.seedDefaults();
        expect(pool.execute).toHaveBeenCalledTimes(2);
        expect(sqlVan(pool.execute)).toMatch(/INSERT IGNORE/i);
    });
});
