import { IGebruikersRepository } from '../repositories/IGebruikersRepository';
import { IGebruikersService } from './IGebruikersService';
import { GebruikerRecord, GebruikerInput } from '../types';

/** Bedrijfslogica voor gebruikersbeheer (CRUD). */
export class GebruikersService implements IGebruikersService {
    constructor(private readonly repo: IGebruikersRepository) {}

    getAll(): Promise<GebruikerRecord[]> {
        return this.repo.getAll();
    }

    create(data: GebruikerInput): Promise<void> {
        return this.repo.create(data);
    }

    update(id: string, data: GebruikerInput): Promise<void> {
        return this.repo.update(id, data);
    }

    remove(id: string): Promise<void> {
        return this.repo.remove(id);
    }
}
