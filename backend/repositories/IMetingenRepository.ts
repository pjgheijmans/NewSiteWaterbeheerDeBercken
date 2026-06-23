import { Meting, GrootBadMetingInput, PeuterbadMetingInput, OpslaanResultaat } from '../types';

export interface IMetingenRepository {
    getMetingen(datum: string): Promise<Meting[]>;
    getBadId(bad_naam: string): Promise<number>;
    savePeuterbadMeting(
        bad_id: number,
        data: PeuterbadMetingInput,
        auteur: string | null,
        verwachteVersie: number | null,
    ): Promise<OpslaanResultaat>;
    saveGrootBadMeting(
        bad_id: number,
        data: GrootBadMetingInput,
        auteur: string | null,
        verwachteVersie: number | null,
    ): Promise<OpslaanResultaat>;
}
