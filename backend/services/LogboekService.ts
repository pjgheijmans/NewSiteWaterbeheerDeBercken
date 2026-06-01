import { ILogboekRepository } from '../repositories/ILogboekRepository';
import { ILogboekService } from './ILogboekService';
import { bepaalAuteur } from '../auteur';
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

    deleteById(id: string): Promise<void> {
        return this.repo.deleteById(id);
    }
}
