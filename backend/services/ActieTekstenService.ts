import { IActieTekstenRepository } from '../repositories/IActieTekstenRepository';
import { IActieTekstenService } from './IActieTekstenService';
import { ActieTekst, ActieTekstInput } from '../types';

/** Bedrijfslogica voor de tekst-sjablonen van acties. */
export class ActieTekstenService implements IActieTekstenService {
    constructor(private readonly repo: IActieTekstenRepository) {}

    getAll(): Promise<ActieTekst[]> {
        return this.repo.getAll();
    }

    getDefaults(): ActieTekst[] {
        return this.repo.getDefaults();
    }

    save(data: ActieTekstInput): Promise<void> {
        return this.repo.save(data);
    }
}
