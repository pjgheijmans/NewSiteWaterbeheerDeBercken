import { GebruikerRecord, GebruikerInput } from '../types';

export interface IGebruikersService {
    getAll(): Promise<GebruikerRecord[]>;
    create(data: GebruikerInput): Promise<void>;
    update(id: string, data: GebruikerInput): Promise<void>;
    remove(id: string): Promise<void>;
}
