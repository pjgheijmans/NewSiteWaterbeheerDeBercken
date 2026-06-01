import { VerbruikService } from '../../../backend/services/VerbruikService';
import { IVerbruikRepository } from '../../../backend/repositories/IVerbruikRepository';
import { IActiesRepository } from '../../../backend/repositories/IActiesRepository';

const verbruikRepo: jest.Mocked<IVerbruikRepository> = {
    getVerbruik: jest.fn(), getVorigeVerbruik: jest.fn(), saveVerbruik: jest.fn(),
    getVerwarming: jest.fn(), saveVerwarming: jest.fn(),
};
const actiesRepo: jest.Mocked<IActiesRepository> = {
    getActies: jest.fn(), resolve: jest.fn(), unresolve: jest.fn(),
    genereer: jest.fn(), genereerVerbruik: jest.fn(),
    genereerBezoekers: jest.fn(), genereerSpoelbeurt: jest.fn(),
};

const service = new VerbruikService(verbruikRepo, actiesRepo);
const DATUM = '2026-05-31';
beforeEach(() => jest.clearAllMocks());

describe('saveVerbruik', () => {
    it('slaat op en triggert daarna actiegeneratie', async () => {
        const body = { datum: DATUM, chemicalien_chloor: 100 };
        await service.saveVerbruik(body);
        expect(verbruikRepo.saveVerbruik).toHaveBeenCalledWith(body);
        expect(actiesRepo.genereerVerbruik).toHaveBeenCalledWith(DATUM, body);
    });

    it('genereert geen acties als het opslaan faalt', async () => {
        verbruikRepo.saveVerbruik.mockRejectedValue(new Error('DB fout'));
        await expect(service.saveVerbruik({ datum: DATUM })).rejects.toThrow('DB fout');
        expect(actiesRepo.genereerVerbruik).not.toHaveBeenCalled();
    });
});

describe('pass-through methoden', () => {
    it('getVerbruik, getVorigeVerbruik, getVerwarming en saveVerwarming delegeren', async () => {
        verbruikRepo.getVerbruik.mockResolvedValue({});
        verbruikRepo.getVorigeVerbruik.mockResolvedValue({});
        verbruikRepo.getVerwarming.mockResolvedValue({});
        await service.getVerbruik(DATUM);
        await service.getVorigeVerbruik(DATUM);
        await service.getVerwarming(DATUM);
        await service.saveVerwarming({ datum: DATUM });
        expect(verbruikRepo.getVerbruik).toHaveBeenCalledWith(DATUM);
        expect(verbruikRepo.getVorigeVerbruik).toHaveBeenCalledWith(DATUM);
        expect(verbruikRepo.getVerwarming).toHaveBeenCalledWith(DATUM);
        expect(verbruikRepo.saveVerwarming).toHaveBeenCalledWith({ datum: DATUM });
        // saveVerwarming triggert géén acties
        expect(actiesRepo.genereerVerbruik).not.toHaveBeenCalled();
    });
});
