import { Rondetaak, Gebruiker } from '../types';

export interface IRondetakenService {
    getRondetaken(datum: string): Promise<Rondetaak[]>;
    voltooi(sleutel: string, datum: string, gebruiker: Gebruiker): Promise<void>;
    heropen(sleutel: string, datum: string): Promise<void>;
}
