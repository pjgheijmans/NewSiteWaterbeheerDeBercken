import { TrendService } from '../../../backend/services/TrendService';
import { ITrendRepository } from '../../../backend/repositories/ITrendRepository';

const repo: jest.Mocked<ITrendRepository> = {
    getMetingenTrend: jest.fn(), getVerbruikTrend: jest.fn(),
};
const service = new TrendService(repo);
beforeEach(() => jest.clearAllMocks());

describe('TrendService delegeert naar de repository', () => {
    it('getMetingenTrend geeft het bereik door', async () => {
        repo.getMetingenTrend.mockResolvedValue([]);
        await service.getMetingenTrend('2026-05-01', '2026-05-31');
        expect(repo.getMetingenTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });

    it('getVerbruikTrend geeft het bereik door', async () => {
        repo.getVerbruikTrend.mockResolvedValue({ algemeen: [], peuterbad: [] });
        await service.getVerbruikTrend('2026-05-01', '2026-05-31');
        expect(repo.getVerbruikTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    });
});
