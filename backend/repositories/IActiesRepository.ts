import { Actie, MetingInput, VerbruikInput, BadTotalen, GebondenChloorResultaat } from '../types';

export interface IActiesRepository {
    getActies(datum: string): Promise<Actie[]>;
    resolve(id: string, opgelost_door: string | null): Promise<void>;
    unresolve(id: string): Promise<void>;
    /** Resolve alle open filter_spoelen_*-acties voor een bad op een datum (filter-rondetaak-koppeling). */
    resolveFilterSpoelen(bad_naam: string, datum: string, door: string | null): Promise<void>;
    /** Heropen alle filter_spoelen_*-acties voor een bad op een datum. */
    unresolveFilterSpoelen(bad_naam: string, datum: string): Promise<void>;
    genereer(bad_id: number, datum: string, bad_naam: string, body: MetingInput): Promise<void>;
    genereerVerbruik(datum: string, body: VerbruikInput): Promise<void>;
    genereerBezoekers(datum: string, bezoekers_vandaag: number | null): Promise<void>;
    genereerSpoelbeurt(datum: string): Promise<BadTotalen>;
    genereerCoordinatoren(datum: string): Promise<void>;
    /** Dagmaximum gebonden chloor (chloor_totaal − chloor_vrij) per bad. */
    getGebondenChloorMax(datum: string): Promise<GebondenChloorResultaat>;
}
