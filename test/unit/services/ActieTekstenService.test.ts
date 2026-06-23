import { ActieTekstenService } from '../../../backend/services/ActieTekstenService';
import { IActieTekstenRepository } from '../../../backend/repositories/IActieTekstenRepository';

const repo: jest.Mocked<IActieTekstenRepository> = {
    getAll: jest.fn(),
    getDefaults: jest.fn(),
    getSjablonen: jest.fn(),
    seedDefaults: jest.fn(),
    save: jest.fn(),
};
const service = new ActieTekstenService(repo);
beforeEach(() => jest.clearAllMocks());

describe('ActieTekstenService delegeert naar de repository', () => {
    it('getAll', async () => {
        repo.getAll.mockResolvedValue([]);
        await service.getAll();
        expect(repo.getAll).toHaveBeenCalled();
    });

    it('getDefaults (synchroon)', () => {
        repo.getDefaults.mockReturnValue([
            { actie_sleutel: 'chloor_bestellen', sjabloon: 'x', omschrijving: null },
        ]);
        expect(service.getDefaults()[0].actie_sleutel).toBe('chloor_bestellen');
    });

    it('save', async () => {
        const payload = { actie_sleutel: 'chloor_bestellen', sjabloon: 'Nieuwe tekst' };
        await service.save(payload);
        expect(repo.save).toHaveBeenCalledWith(payload);
    });
});
