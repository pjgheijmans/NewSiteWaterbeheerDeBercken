import { Meting, GrootBadMetingInput, PeuterbadMetingInput } from '../types';

export interface IMetingenRepository {
    getMetingen(datum: string): Promise<Meting[]>;
    getBadId(bad_naam: string): Promise<number>;
    savePeuterbadMeting(bad_id: number, data: PeuterbadMetingInput): Promise<void>;
    saveGrootBadMeting(bad_id: number, data: GrootBadMetingInput): Promise<void>;
}
