import { Gebruiker } from './types';

/**
 * Bepaal de weer te geven auteursnaam voor een ingelogde gebruiker.
 * Valt terug van "voornaam achternaam" naar inlognaam naar gebruikersnaam.
 */
export function bepaalAuteur(g: Gebruiker): string {
    return [g.voornaam, g.achternaam].filter((n): n is string => !!n).join(' ').trim()
        || g.inlognaam
        || g.gebruikersnaam;
}
