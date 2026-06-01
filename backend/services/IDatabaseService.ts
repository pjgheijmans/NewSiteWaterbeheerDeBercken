export interface IDatabaseService {
    /** Bouw een CSV-export voor een tabel; geeft null terug als de tabel leeg is. */
    exporteerCsv(tabel: string): Promise<string | null>;
    /** Parse en importeer CSV-tekst in een tabel (lost bad_naam → bad_id op waar nodig). */
    importeerCsv(tabel: string, ruweTekst: string): Promise<void>;
    truncate(tabel: string): Promise<void>;
    /** Wis alle datatabellen. */
    wisAlles(): Promise<void>;
    /** Maak tabellen aan, wis data en zaai standaardwaarden. */
    initialiseer(): Promise<void>;
}
