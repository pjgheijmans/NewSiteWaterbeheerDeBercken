import { Actie, MetingInput, BadTotalen } from '../types';

export interface IActiesRepository {
    getActies(datum: string): Promise<Actie[]>;
    resolve(id: string, opgelost_door: string | null): Promise<void>;
    unresolve(id: string): Promise<void>;
    genereer(bad_id: number, datum: string, bad_naam: string, body: MetingInput): Promise<void>;
    genereerVerbruik(datum: string, body: Record<string, unknown>): Promise<void>;
    genereerBezoekers(datum: string, bezoekers_vandaag: number | null): Promise<void>;
    genereerSpoelbeurt(datum: string): Promise<BadTotalen>;
}
