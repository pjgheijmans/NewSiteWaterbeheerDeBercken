import { Configuratie } from '../types';

export interface IConfiguratieRepository {
    getAll(): Promise<Configuratie[]>;
    upsert(sleutel: string, waarde: string): Promise<void>;
}
