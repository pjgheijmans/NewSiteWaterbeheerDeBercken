import { IVerbruikRepository } from '../repositories/IVerbruikRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { IVerbruikService } from './IVerbruikService';
import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput } from '../types';

/**
 * Bedrijfslogica voor verbruik en verwarmingssysteem.
 * Triggert actiegeneratie (chemicaliën-voorraad) na het opslaan van verbruik.
 */
export class VerbruikService implements IVerbruikService {
    constructor(
        private readonly verbruikRepo: IVerbruikRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {}

    getVerbruik(datum: string): Promise<VerbruikData> {
        return this.verbruikRepo.getVerbruik(datum);
    }

    getVorigeVerbruik(datum: string): Promise<VerbruikData> {
        return this.verbruikRepo.getVorigeVerbruik(datum);
    }

    async saveVerbruik(body: VerbruikInput): Promise<void> {
        await this.verbruikRepo.saveVerbruik(body);
        await this.actiesRepo.genereerVerbruik(body.datum, body);
    }

    getVerwarming(datum: string): Promise<VerwarmingData> {
        return this.verbruikRepo.getVerwarming(datum);
    }

    saveVerwarming(body: VerwarmingInput): Promise<void> {
        return this.verbruikRepo.saveVerwarming(body);
    }
}
