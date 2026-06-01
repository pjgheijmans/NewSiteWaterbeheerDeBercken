import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput } from '../types';

export interface IVerbruikService {
    getVerbruik(datum: string): Promise<VerbruikData>;
    getVorigeVerbruik(datum: string): Promise<VerbruikData>;
    saveVerbruik(body: VerbruikInput): Promise<void>;
    getVerwarming(datum: string): Promise<VerwarmingData>;
    saveVerwarming(body: VerwarmingInput): Promise<void>;
}
