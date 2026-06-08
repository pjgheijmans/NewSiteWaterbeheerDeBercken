import { WaterbeheerDienst, WaterbeheerDienstInput } from '../types';

export interface IDienstRepository {
    /** De dienst (twee personen) voor een dag; lege velden als er niets is ingevuld. */
    getDienst(datum: string): Promise<WaterbeheerDienst>;
    /** Sla de dienst van een dag op (upsert per datum). */
    saveDienst(data: WaterbeheerDienstInput): Promise<void>;
}
