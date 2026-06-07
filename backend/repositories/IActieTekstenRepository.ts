import { ActieTekst, ActieTekstInput } from '../types';

export interface IActieTekstenRepository {
    /** Alle sjablonen: standaarden samengevoegd met (eventuele) DB-overrides. */
    getAll(): Promise<ActieTekst[]>;
    /** De ingebakken standaard-sjablonen (zonder DB te raadplegen). */
    getDefaults(): ActieTekst[];
    /** Map actie_sleutel → sjabloon, gebruikt bij het genereren van acties. */
    getSjablonen(): Promise<Record<string, string>>;
    /** Vul ontbrekende standaarden aan (INSERT IGNORE). */
    seedDefaults(): Promise<void>;
    /** Wijzig één sjabloon (upsert). */
    save(data: ActieTekstInput): Promise<void>;
}
