import { DienstService } from '../../../backend/services/DienstService';
import { IDienstRepository } from '../../../backend/repositories/IDienstRepository';
import { IGebruikersRepository, GebruikerNaam } from '../../../backend/repositories/IGebruikersRepository';

const dienstRepo: jest.Mocked<IDienstRepository> = {
    getDienst: jest.fn(), saveDienst: jest.fn(),
};
const gebruikersRepo: jest.Mocked<IGebruikersRepository> = {
    findByLogin: jest.fn(), getAll: jest.fn(), getMetRecht: jest.fn(), create: jest.fn(),
    update: jest.fn(), remove: jest.fn(), seedDefaults: jest.fn(),
    hashBestaandeWachtwoorden: jest.fn(),
};
const service = new DienstService(dienstRepo, gebruikersRepo);

function naam(voornaam: string, achternaam: string, inlognaam = ''): GebruikerNaam {
    return { voornaam, achternaam, inlognaam };
}

beforeEach(() => jest.clearAllMocks());

describe('delegatie naar de dienst-repository', () => {
    it('getDienst', async () => {
        dienstRepo.getDienst.mockResolvedValue({ dienst_1: 'Jan', dienst_2: null });
        await service.getDienst('2026-06-08');
        expect(dienstRepo.getDienst).toHaveBeenCalledWith('2026-06-08');
    });

    it('saveDienst', async () => {
        const data = { datum: '2026-06-08', dienst_1: 'Jan', dienst_2: 'Piet' };
        await service.saveDienst(data);
        expect(dienstRepo.saveDienst).toHaveBeenCalledWith(data);
    });
});

describe('getWaterbeheerders', () => {
    it('vraagt de namen met waterbeheer-recht op, bouwt namen, dedupliceert en sorteert', async () => {
        gebruikersRepo.getMetRecht.mockResolvedValue([
            naam('Piet', 'Jansen'),
            naam('Anna', 'Bos'),
            naam('Piet', 'Jansen'),  // duplicaat
        ]);
        expect(await service.getWaterbeheerders()).toEqual(['Anna Bos', 'Piet Jansen']);
        expect(gebruikersRepo.getMetRecht).toHaveBeenCalledWith('waterbeheer', 'schrijven');
    });

    it('valt terug op inlognaam als de naam leeg is', async () => {
        gebruikersRepo.getMetRecht.mockResolvedValue([naam('', '', 'jdoe')]);
        expect(await service.getWaterbeheerders()).toEqual(['jdoe']);
    });
});
