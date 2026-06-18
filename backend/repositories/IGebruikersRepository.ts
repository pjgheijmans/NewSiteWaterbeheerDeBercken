import { Gebruiker, GebruikerRecord, GebruikerInput, Domein, Rechtniveau } from '../types';

/** Naamvelden van een gebruiker; gebruikt voor keuzelijsten. */
export type GebruikerNaam = Pick<GebruikerRecord, 'voornaam' | 'achternaam' | 'inlognaam'>;

export interface IGebruikersRepository {
    findByLogin(inlognaam: string, wachtwoord: string): Promise<Gebruiker | null>;
    getAll(): Promise<GebruikerRecord[]>;
    /** Gebruikers die minstens `minNiveau` hebben in `domein` (via een van hun rollen). */
    getMetRecht(domein: Domein, minNiveau: Rechtniveau): Promise<GebruikerNaam[]>;
    create(data: GebruikerInput): Promise<void>;
    update(id: string, data: GebruikerInput): Promise<void>;
    remove(id: string): Promise<void>;
    seedDefaults(): Promise<void>;
    hashBestaandeWachtwoorden(): Promise<void>;
}
