import { Rondetaak } from '../types';

export interface IRondetakenRepository {
    /** Alle rondetaken voor een dag: catalogus samengevoegd met de voltooiingen. */
    getRondetaken(datum: string): Promise<Rondetaak[]>;
    /** Vink een taak af voor een dag (idempotent). Onbekende sleutels worden genegeerd. */
    voltooi(sleutel: string, datum: string, door: string | null): Promise<void>;
    /** Vink een taak weer uit voor een dag. */
    heropen(sleutel: string, datum: string): Promise<void>;
}
