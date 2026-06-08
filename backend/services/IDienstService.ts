import { WaterbeheerDienst, WaterbeheerDienstInput } from '../types';

export interface IDienstService {
    getDienst(datum: string): Promise<WaterbeheerDienst>;
    saveDienst(data: WaterbeheerDienstInput): Promise<void>;
    /** Namen van de geregistreerde waterbeheerders, voor de keuzelijst. */
    getWaterbeheerders(): Promise<string[]>;
}
