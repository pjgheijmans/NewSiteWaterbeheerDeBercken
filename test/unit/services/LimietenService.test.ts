import { LimietenService } from '../../../backend/services/LimietenService';
import { ILimietenRepository } from '../../../backend/repositories/ILimietenRepository';

const repo: jest.Mocked<ILimietenRepository> = {
    getAll: jest.fn(), getDefaults: jest.fn(), seedDefaults: jest.fn(), save: jest.fn(),
};
const service = new LimietenService(repo);
beforeEach(() => jest.clearAllMocks());

describe('LimietenService delegeert naar de repository', () => {
    it('getAll', async () => {
        repo.getAll.mockResolvedValue({});
        await service.getAll();
        expect(repo.getAll).toHaveBeenCalled();
    });

    it('getDefaults (synchroon)', () => {
        repo.getDefaults.mockReturnValue({ ph_waarde: { min: 6.8, max: 7.6 } });
        expect(service.getDefaults().ph_waarde).toEqual({ min: 6.8, max: 7.6 });
    });

    it('save', async () => {
        const payload = { parameter_naam: 'ph_waarde', min_waarde: 6.8, max_waarde: 7.6 };
        await service.save(payload);
        expect(repo.save).toHaveBeenCalledWith(payload);
    });
});
