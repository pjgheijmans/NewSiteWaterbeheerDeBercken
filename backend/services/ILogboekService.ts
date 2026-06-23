import { LogboekEntry, LogboekOpslaanResultaat, Gebruiker } from '../types';

export interface ILogboekService {
    getByDatum(datum: string): Promise<LogboekEntry[]>;
    save(
        datum: string,
        tijdstip: string,
        tekst: string,
        gebruiker: Gebruiker,
    ): Promise<LogboekOpslaanResultaat>;
    deleteById(id: string, gebruiker: Gebruiker): Promise<void>;
}
