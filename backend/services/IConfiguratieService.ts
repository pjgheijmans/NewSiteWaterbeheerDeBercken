import { Configuratie } from '../types';

export interface IConfiguratieService {
    /** Laadt de configuratie in de in-memory cache (faalt zacht zonder DB). */
    laadCache(): Promise<void>;
    /** Alle instellingen voor de admin-UI. */
    getAll(): Promise<Configuratie[]>;
    /** Sessie-time-out in milliseconden (synchroon, uit de cache). */
    getSessieTimeoutMs(): number;
    /** Valideert en bewaart één instelling en ververst de cache. */
    update(sleutel: string, waarde: string): Promise<void>;
}
