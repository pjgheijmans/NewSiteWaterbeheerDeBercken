import { IGebruikersRepository } from '../repositories/IGebruikersRepository';
import { IAuthService } from './IAuthService';
import { Gebruiker } from '../types';

/** Authenticatielogica: verifieert inloggegevens tegen de gebruikers-repository. */
export class AuthService implements IAuthService {
    constructor(private readonly gebruikersRepo: IGebruikersRepository) {}

    login(gebruikersnaam: string, wachtwoord: string): Promise<Gebruiker | null> {
        return this.gebruikersRepo.findByLogin(gebruikersnaam, wachtwoord);
    }
}
