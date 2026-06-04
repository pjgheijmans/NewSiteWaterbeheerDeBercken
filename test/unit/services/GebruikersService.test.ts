import { GebruikersService } from '../../../backend/services/GebruikersService';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';

const repo: jest.Mocked<IGebruikersRepository> = {
    findByLogin: jest.fn(), getAll: jest.fn(), create: jest.fn(),
    update: jest.fn(), remove: jest.fn(), seedDefaults: jest.fn(),
    hashBestaandeWachtwoorden: jest.fn(),
};
const service = new GebruikersService(repo);
beforeEach(() => jest.clearAllMocks());

const input = { voornaam: 'Jan', achternaam: 'Jansen', inlognaam: 'jjansen', wachtwoord: 'x', taak: 'coordinator' };

describe('GebruikersService delegeert naar de repository', () => {
    it('getAll', async () => {
        repo.getAll.mockResolvedValue([]);
        await service.getAll();
        expect(repo.getAll).toHaveBeenCalled();
    });

    it('create', async () => {
        await service.create(input);
        expect(repo.create).toHaveBeenCalledWith(input);
    });

    it('update geeft id en data door', async () => {
        await service.update('5', input);
        expect(repo.update).toHaveBeenCalledWith('5', input);
    });

    it('remove', async () => {
        await service.remove('9');
        expect(repo.remove).toHaveBeenCalledWith('9');
    });
});
