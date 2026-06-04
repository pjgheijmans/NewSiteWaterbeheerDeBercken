import { Pool } from 'mysql2/promise';
import { GebruikersRepository } from '../../../backend/repositories/GebruikersRepository';
import { hashWachtwoord, isGehasht } from '../../../backend/wachtwoord';
import { maakMockPool, resultaat, paramsVan, sqlVan, MockPool } from '../../helpers/mockPool';

let pool: MockPool;
let repo: GebruikersRepository;

beforeEach(() => {
    pool = maakMockPool();
    repo = new GebruikersRepository(pool as unknown as Pool);
});

describe('findByLogin', () => {
    it('verifieert een gehasht wachtwoord en geeft de gebruiker terug zonder wachtwoord', async () => {
        const hash = hashWachtwoord('Paul');
        pool.execute.mockResolvedValue(resultaat([
            { id: 1, voornaam: 'Paul', achternaam: 'H', inlognaam: 'pheijmans', taak: 'waterbeheerder', wachtwoord: hash },
        ]));
        const g = await repo.findByLogin('pheijmans', 'Paul');
        expect(g).toMatchObject({ id: 1, taak: 'waterbeheerder' });
        expect((g as unknown as Record<string, unknown>).wachtwoord).toBeUndefined();
        // Zoekt uitsluitend op inlognaam; verificatie gebeurt in code.
        expect(paramsVan(pool.execute)).toEqual(['pheijmans']);
        // Reeds gehasht → geen upgrade-UPDATE.
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('geeft null bij een verkeerd wachtwoord', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { id: 1, inlognaam: 'pheijmans', taak: 'waterbeheerder', wachtwoord: hashWachtwoord('Paul') },
        ]));
        expect(await repo.findByLogin('pheijmans', 'fout')).toBeNull();
    });

    it('geeft null zonder match', async () => {
        pool.execute.mockResolvedValue(resultaat([]));
        expect(await repo.findByLogin('x', 'y')).toBeNull();
    });

    it('upgradet een legacy plaintext-wachtwoord naar een hash bij een geslaagde login', async () => {
        pool.execute.mockResolvedValue(resultaat([
            { id: 7, inlognaam: 'pheijmans', taak: 'waterbeheerder', wachtwoord: 'Paul' },
        ]));
        const g = await repo.findByLogin('pheijmans', 'Paul');
        expect(g).toMatchObject({ id: 7 });
        // Tweede call = UPDATE met gehasht wachtwoord.
        expect(pool.execute).toHaveBeenCalledTimes(2);
        expect(sqlVan(pool.execute, 1)).toMatch(/UPDATE gebruikers SET wachtwoord/i);
        const updateParams = paramsVan(pool.execute, 1);
        expect(isGehasht(updateParams[0] as string)).toBe(true);
        expect(updateParams[1]).toBe(7);
    });
});

describe('getAll', () => {
    it('geeft gebruikers terug zonder het wachtwoord in de SELECT-lijst', async () => {
        pool.execute.mockResolvedValue(resultaat([{ id: 1 }, { id: 2 }]));
        expect(await repo.getAll()).toHaveLength(2);
        const sql = sqlVan(pool.execute);
        expect(sql.slice(0, sql.indexOf('FROM'))).not.toMatch(/wachtwoord/i);
    });
});

describe('create', () => {
    it('hasht het wachtwoord voor het opslaan', async () => {
        await repo.create({ voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen', wachtwoord: 'x', taak: 'coordinator' });
        const params = paramsVan(pool.execute);
        expect(params[0]).toBe('Jan');
        expect(isGehasht(params[3] as string)).toBe(true);
        expect(params[3]).not.toBe('x');
    });
});

describe('update', () => {
    it('hasht een nieuw wachtwoord en zet het id als laatste parameter', async () => {
        await repo.update('5', { voornaam: 'Jan', achternaam: 'J', inlognaam: 'jj', wachtwoord: 'x', taak: 'coordinator' });
        const params = paramsVan(pool.execute);
        expect(sqlVan(pool.execute)).toMatch(/wachtwoord=\?/i);
        expect(isGehasht(params[3] as string)).toBe(true);
        expect(params[params.length - 1]).toBe('5');
    });

    it('laat het wachtwoord ongemoeid wanneer het leeg is', async () => {
        await repo.update('5', { voornaam: 'Jan', achternaam: 'J', inlognaam: 'jj', wachtwoord: '', taak: 'coordinator' });
        expect(sqlVan(pool.execute)).not.toMatch(/wachtwoord/i);
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
    it('voegt beide standaardgebruikers met een gehasht wachtwoord toe (INSERT IGNORE)', async () => {
        await repo.seedDefaults();
        expect(pool.execute).toHaveBeenCalledTimes(2);
        expect(sqlVan(pool.execute)).toMatch(/INSERT IGNORE/i);
        expect(isGehasht(paramsVan(pool.execute)[3] as string)).toBe(true);
    });
});

describe('hashBestaandeWachtwoorden', () => {
    it('hasht alleen de nog niet-gehashte wachtwoorden', async () => {
        pool.execute
            .mockResolvedValueOnce(resultaat([
                { id: 1, wachtwoord: 'Paul' },               // legacy → moet gehasht
                { id: 2, wachtwoord: hashWachtwoord('al') }, // al gehasht → overslaan
            ]))
            .mockResolvedValue(resultaat([]));
        await repo.hashBestaandeWachtwoorden();
        // 1 SELECT + 1 UPDATE (alleen voor id 1)
        expect(pool.execute).toHaveBeenCalledTimes(2);
        const upd = paramsVan(pool.execute, 1);
        expect(isGehasht(upd[0] as string)).toBe(true);
        expect(upd[1]).toBe(1);
    });
});
