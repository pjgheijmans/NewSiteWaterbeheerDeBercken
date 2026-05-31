import { LogboekEntry, LogboekSaveResult } from '../types';

export interface ICoordinatorenLogboekRepository {
    getByDatum(datum: string): Promise<LogboekEntry[]>;
    save(datum: string, tijdstip: string, tekst: string, auteur: string | null): Promise<LogboekSaveResult | null>;
    deleteById(id: string): Promise<void>;
}
