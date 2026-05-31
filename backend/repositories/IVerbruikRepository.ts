import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput } from '../types';

export interface IVerbruikRepository {
    getVerbruik(datum: string): Promise<VerbruikData>;
    getVorigeVerbruik(datum: string): Promise<VerbruikData>;
    saveVerbruik(data: VerbruikInput): Promise<void>;
    getVerwarming(datum: string): Promise<VerwarmingData>;
    saveVerwarming(data: VerwarmingInput): Promise<void>;
}
