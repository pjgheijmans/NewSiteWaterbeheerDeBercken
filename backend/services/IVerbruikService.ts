import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput, OpslaanResultaat } from '../types';

export interface IVerbruikService {
    getVerbruik(datum: string): Promise<VerbruikData>;
    getVorigeVerbruik(datum: string): Promise<VerbruikData>;
    saveVerbruik(body: VerbruikInput, auteur: string | null): Promise<OpslaanResultaat>;
    getVerwarming(datum: string): Promise<VerwarmingData>;
    saveVerwarming(body: VerwarmingInput, auteur: string | null): Promise<OpslaanResultaat>;
}
