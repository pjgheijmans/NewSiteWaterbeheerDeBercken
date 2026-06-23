import { IGebruikersRepository } from '../repositories/IGebruikersRepository';
import { IAuthService } from './IAuthService';
import { Gebruiker } from '../types';

/** Authenticatielogica: verifieert inloggegevens tegen de gebruikers-repository. */
export class AuthService implements IAuthService {
    constructor(private readonly gebruikersRepo: IGebruikersRepository) {}

    async login(gebruikersnaam: string, wachtwoord: string): Promise<Gebruiker | null> {
        const gebruiker = await this.gebruikersRepo.findByLogin(gebruikersnaam, wachtwoord);
        if (!gebruiker) return null;
        return { ...gebruiker, weergavenaam: await this._weergavenaam(gebruiker) };
    }

    /**
     * Weergavenaam voor de kop: de voornaam, en — als meerdere gebruikers dezelfde
     * voornaam hebben — aangevuld met de eerste letter van de achternaam ("Paul H").
     * Botst die initiaal óók met een naamgenoot (bv. Heijmans/Hermans), dan de
     * volledige achternaam ("Paul Heijmans").
     */
    private async _weergavenaam(g: Gebruiker): Promise<string> {
        const voornaam = (g.voornaam ?? '').trim();
        if (!voornaam) return (g.inlognaam ?? '').trim() || g.gebruikersnaam;

        const alle = (await this.gebruikersRepo.getAll()) ?? [];
        const zelfdeVoornaam = alle.filter(
            (u) => (u.voornaam ?? '').trim().toLowerCase() === voornaam.toLowerCase(),
        );
        if (zelfdeVoornaam.length <= 1) return voornaam;

        const achternaam = (g.achternaam ?? '').trim();
        if (!achternaam) return voornaam;

        const initiaal = achternaam.charAt(0).toUpperCase();
        const initiaalBotst = zelfdeVoornaam.some(
            (u) =>
                u.id !== g.id && (u.achternaam ?? '').trim().charAt(0).toUpperCase() === initiaal,
        );
        return initiaalBotst ? `${voornaam} ${achternaam}` : `${voornaam} ${initiaal}`;
    }
}
