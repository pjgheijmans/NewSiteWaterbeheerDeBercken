import { AuthService } from '../../../backend/services/AuthService';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { maakTestGebruiker } from '../../helpers/testApp';

const repo: jest.Mocked<IGebruikersRepository> = {
    findByLogin: jest.fn(), getAll: jest.fn(), create: jest.fn(),
    update: jest.fn(), remove: jest.fn(), seedDefaults: jest.fn(),
    hashBestaandeWachtwoorden: jest.fn(),
};
const service = new AuthService(repo);
beforeEach(() => jest.clearAllMocks());

describe('login', () => {
    it('geeft de gebruiker terug bij een match', async () => {
        repo.findByLogin.mockResolvedValue(maakTestGebruiker('waterbeheerder'));
        const g = await service.login('pheijmans', 'Paul');
        expect(g?.taak).toBe('waterbeheerder');
        expect(repo.findByLogin).toHaveBeenCalledWith('pheijmans', 'Paul');
    });

    it('geeft null terug bij geen match', async () => {
        repo.findByLogin.mockResolvedValue(null);
        expect(await service.login('x', 'y')).toBeNull();
    });
});
