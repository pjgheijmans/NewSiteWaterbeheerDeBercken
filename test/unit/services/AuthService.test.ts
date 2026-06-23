import { AuthService } from '../../../backend/services/AuthService';
import { IGebruikersRepository } from '../../../backend/repositories/IGebruikersRepository';
import { maakTestGebruiker } from '../../helpers/testApp';

const repo: jest.Mocked<IGebruikersRepository> = {
    findByLogin: jest.fn(),
    getAll: jest.fn(),
    getMetRecht: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    seedDefaults: jest.fn(),
    hashBestaandeWachtwoorden: jest.fn(),
};
const service = new AuthService(repo);
beforeEach(() => jest.clearAllMocks());

describe('login', () => {
    it('geeft de gebruiker terug bij een match', async () => {
        repo.findByLogin.mockResolvedValue(maakTestGebruiker('waterbeheerder'));
        repo.getAll.mockResolvedValue([]);
        const g = await service.login('pheijmans', 'Paul');
        expect(g?.taak).toBe('waterbeheerder');
        expect(repo.findByLogin).toHaveBeenCalledWith('pheijmans', 'Paul');
    });

    it('geeft null terug bij geen match', async () => {
        repo.findByLogin.mockResolvedValue(null);
        expect(await service.login('x', 'y')).toBeNull();
    });

    it('gebruikt alleen de voornaam als die uniek is', async () => {
        repo.findByLogin.mockResolvedValue({
            id: 1,
            gebruikersnaam: 'p',
            taak: 'waterbeheerder',
            voornaam: 'Paul',
            achternaam: 'Heijmans',
            inlognaam: 'pheijmans',
        });
        repo.getAll.mockResolvedValue([
            {
                id: 1,
                voornaam: 'Paul',
                achternaam: 'Heijmans',
                inlognaam: 'pheijmans',
                rol_ids: [],
            },
            { id: 2, voornaam: 'Jan', achternaam: 'Bos', inlognaam: 'jbos', rol_ids: [] },
        ]);
        expect((await service.login('pheijmans', 'Paul'))?.weergavenaam).toBe('Paul');
    });

    it('vult de achternaam-initiaal aan bij een dubbele voornaam', async () => {
        repo.findByLogin.mockResolvedValue({
            id: 1,
            gebruikersnaam: 'p',
            taak: 'waterbeheerder',
            voornaam: 'Paul',
            achternaam: 'Heijmans',
            inlognaam: 'pheijmans',
        });
        repo.getAll.mockResolvedValue([
            {
                id: 1,
                voornaam: 'Paul',
                achternaam: 'Heijmans',
                inlognaam: 'pheijmans',
                rol_ids: [],
            },
            { id: 2, voornaam: 'Paul', achternaam: 'Visser', inlognaam: 'pvisser', rol_ids: [] },
        ]);
        expect((await service.login('pheijmans', 'Paul'))?.weergavenaam).toBe('Paul H');
    });

    it('gebruikt de volledige achternaam als de initiaal ook botst (Heijmans/Hermans)', async () => {
        repo.findByLogin.mockResolvedValue({
            id: 1,
            gebruikersnaam: 'p',
            taak: 'waterbeheerder',
            voornaam: 'Paul',
            achternaam: 'Heijmans',
            inlognaam: 'pheijmans',
        });
        repo.getAll.mockResolvedValue([
            {
                id: 1,
                voornaam: 'Paul',
                achternaam: 'Heijmans',
                inlognaam: 'pheijmans',
                rol_ids: [],
            },
            { id: 2, voornaam: 'Paul', achternaam: 'Hermans', inlognaam: 'phermans', rol_ids: [] },
        ]);
        expect((await service.login('pheijmans', 'Paul'))?.weergavenaam).toBe('Paul Heijmans');
    });
});
