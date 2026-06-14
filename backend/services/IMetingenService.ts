import { Meting, MetingInput, Actie, Gebruiker, BezoekersResultaat, GebondenChloorResultaat, OpslaanResultaat } from '../types';

export interface IMetingenService {
    getMetingen(datum: string): Promise<Meting[]>;
    saveMeting(body: MetingInput, auteur: string | null): Promise<OpslaanResultaat>;
    getActies(datum: string): Promise<Actie[]>;
    resolveActie(id: string, gebruiker: Gebruiker): Promise<void>;
    unresolveActie(id: string): Promise<void>;
    getBezoekers(datum: string): Promise<BezoekersResultaat>;
    getGebondenChloor(datum: string): Promise<GebondenChloorResultaat>;
}
