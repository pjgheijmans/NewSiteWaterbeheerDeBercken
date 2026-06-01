import { Gebruiker } from '../types';

export interface IAuthService {
    /** Verifieer inloggegevens; geeft de gebruiker terug of null bij een mismatch. */
    login(gebruikersnaam: string, wachtwoord: string): Promise<Gebruiker | null>;
}
