import { LogboekService } from '../../../backend/services/LogboekService';
import { ILogboekRepository } from '../../../backend/repositories/ILogboekRepository';
import { Gebruiker } from '../../../backend/types';

const repo: jest.Mocked<ILogboekRepository> = {
    getByDatum: jest.fn(),
    save: jest.fn(),
    getDatumById: jest.fn(),
    deleteById: jest.fn(),
};
const service = new LogboekService(repo);
const DATUM = '2026-05-31';
const gebruiker: Gebruiker = {
    id: 1,
    gebruikersnaam: 'tu',
    taak: 'waterbeheerder',
    voornaam: 'Test',
    achternaam: 'User',
    inlognaam: 'tu',
};
beforeEach(() => jest.clearAllMocks());

describe('save', () => {
    it('berekent de auteur en geeft id + auteur uit de repo-rij terug', async () => {
        repo.save.mockResolvedValue({ id: 7, auteur: 'Test User' });
        const result = await service.save(DATUM, '10:00:00', 'Tekst', gebruiker);
        expect(result).toEqual({ id: 7, auteur: 'Test User' });
        expect(repo.save).toHaveBeenCalledWith(DATUM, '10:00:00', 'Tekst', 'Test User');
    });

    it('valt terug op berekende auteur en id null als de repo niets teruggeeft', async () => {
        repo.save.mockResolvedValue(null);
        const result = await service.save(DATUM, '10:00:00', '', gebruiker);
        expect(result).toEqual({ id: null, auteur: 'Test User' });
    });
});

describe('pass-through', () => {
    it('getByDatum delegeert', async () => {
        repo.getByDatum.mockResolvedValue([]);
        await service.getByDatum(DATUM);
        expect(repo.getByDatum).toHaveBeenCalledWith(DATUM);
    });
});

describe('deleteById (historie-bewaking)', () => {
    it('verwijdert een regel van vandaag', async () => {
        repo.getDatumById.mockResolvedValue(new Date().toISOString().slice(0, 10));
        await service.deleteById('3', gebruiker);
        expect(repo.deleteById).toHaveBeenCalledWith('3');
    });

    it('blokkeert het verwijderen van een datum in het verleden zonder historie-recht', async () => {
        repo.getDatumById.mockResolvedValue('2000-01-01');
        await expect(
            service.deleteById('3', { ...gebruiker, magHistorie: false }),
        ).rejects.toMatchObject({ status: 403 });
        expect(repo.deleteById).not.toHaveBeenCalled();
    });

    it('staat verwijderen in het verleden toe mét historie-recht', async () => {
        repo.getDatumById.mockResolvedValue('2000-01-01');
        await service.deleteById('3', { ...gebruiker, magHistorie: true });
        expect(repo.deleteById).toHaveBeenCalledWith('3');
    });
});
