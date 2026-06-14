import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput, OpslaanResultaat } from '../types';

export interface IVerbruikRepository {
    getVerbruik(datum: string): Promise<VerbruikData>;
    getVorigeVerbruik(datum: string): Promise<VerbruikData>;
    saveVerbruik(data: VerbruikInput, auteur: string | null, verwachteVersie: number | null): Promise<OpslaanResultaat>;
    getVerwarming(datum: string): Promise<VerwarmingData>;
    saveVerwarming(data: VerwarmingInput, auteur: string | null, verwachteVersie: number | null): Promise<OpslaanResultaat>;
}
