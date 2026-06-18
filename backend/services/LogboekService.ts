import { ILogboekRepository } from '../repositories/ILogboekRepository';
import { ILogboekService } from './ILogboekService';
import { bepaalAuteur } from '../auteur';
import { magDatumBewerken } from '../middleware/auth';
import { AppError } from '../errors';
import { LogboekEntry, LogboekOpslaanResultaat, Gebruiker } from '../types';

/** Bedrijfslogica voor het waterbeheer-logboek; berekent de auteur. */
export class LogboekService implements ILogboekService {
    constructor(private readonly repo: ILogboekRepository) {}

    getByDatum(datum: string): Promise<LogboekEntry[]> {
        return this.repo.getByDatum(datum);
    }

    async save(datum: string, tijdstip: string, tekst: string, gebruiker: Gebruiker): Promise<LogboekOpslaanResultaat> {
        const auteur = bepaalAuteur(gebruiker);
        const row = await this.repo.save(datum, tijdstip, tekst, auteur);
        return { id: row?.id ?? null, auteur: row?.auteur ?? auteur };
    }

    async deleteById(id: string, gebruiker: Gebruiker): Promise<void> {
        const datum = await this.repo.getDatumById(id);
        if (datum && !magDatumBewerken(datum, gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        await this.repo.deleteById(id);
    }
}
