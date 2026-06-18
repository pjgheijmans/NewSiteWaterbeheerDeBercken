import { LogboekEntry, LogboekSaveResult } from '../types';

export interface ICoordinatorenLogboekRepository {
    getByDatum(datum: string): Promise<LogboekEntry[]>;
    save(datum: string, tijdstip: string, tekst: string, auteur: string | null): Promise<LogboekSaveResult | null>;
    /** Datum (YYYY-MM-DD) van een regel, of null als de regel niet bestaat. */
    getDatumById(id: string): Promise<string | null>;
    deleteById(id: string): Promise<void>;
}
