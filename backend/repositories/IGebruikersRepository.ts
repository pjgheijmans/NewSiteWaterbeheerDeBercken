import { Gebruiker, GebruikerRecord, GebruikerInput } from '../types';

export interface IGebruikersRepository {
    findByLogin(inlognaam: string, wachtwoord: string): Promise<Gebruiker | null>;
    getAll(): Promise<GebruikerRecord[]>;
    create(data: GebruikerInput): Promise<void>;
    update(id: string, data: GebruikerInput): Promise<void>;
    remove(id: string): Promise<void>;
    seedDefaults(): Promise<void>;
    hashBestaandeWachtwoorden(): Promise<void>;
}
