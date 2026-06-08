import { DienstService } from '../../../backend/services/DienstService';
import { IDienstRepository } from '../../../backend/repositories/IDienstRepository';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { GebruikerRecord } from '../../../backend/types';

const dienstRepo: jest.Mocked<IDienstRepository> = {
    getDienst: jest.fn(), saveDienst: jest.fn(),
};
const gebruikersRepo: jest.Mocked<IGebruikersRepository> = {
    findByLogin: jest.fn(), getAll: jest.fn(), create: jest.fn(),
    update: jest.fn(), remove: jest.fn(), seedDefaults: jest.fn(),
    hashBestaandeWachtwoorden: jest.fn(),
};
const service = new DienstService(dienstRepo, gebruikersRepo);

function rec(voornaam: string, achternaam: string, taak: string, inlognaam = ''): GebruikerRecord {
    return { id: 1, voornaam, achternaam, inlognaam, taak };
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
    it('filtert op rol, bouwt namen, dedupliceert en sorteert', async () => {
        gebruikersRepo.getAll.mockResolvedValue([
            rec('Piet', 'Jansen', 'waterbeheerder'),
            rec('Anna', 'Bos', 'Administrator'),
            rec('Co', 'Ord', 'coordinator'),          // valt weg (geen waterbeheerder)
            rec('Piet', 'Jansen', 'waterbeheerder'),  // duplicaat
        ]);
        expect(await service.getWaterbeheerders()).toEqual(['Anna Bos', 'Piet Jansen']);
    });

    it('valt terug op inlognaam als de naam leeg is', async () => {
        gebruikersRepo.getAll.mockResolvedValue([rec('', '', 'waterbeheerder', 'jdoe')]);
        expect(await service.getWaterbeheerders()).toEqual(['jdoe']);
    });
});
