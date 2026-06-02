import { ICoordinatorenRepository } from '../repositories/ICoordinatorenRepository';
import { ICoordinatorenLogboekRepository } from '../repositories/ICoordinatorenLogboekRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { ICoordinatorenService } from './ICoordinatorenService';
import { bepaalAuteur } from '../auteur';
import { CoordinatorBlok, CoordinatorMetingInput, Checklist, ChecklistInput,
         Daggegevens, DaggegevensInput, LogboekEntry, LogboekOpslaanResultaat, Gebruiker } from '../types';

/**
 * Bedrijfslogica voor coordinatoren: metingen-blokken, checklist, daggegevens
 * (met actiegeneratie) en het coordinatoren-logboek.
 */
export class CoordinatorenService implements ICoordinatorenService {
    constructor(
        private readonly coordRepo: ICoordinatorenRepository,
        private readonly logboekRepo: ICoordinatorenLogboekRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {}

    getCoordinatoren(datum: string): Promise<CoordinatorBlok[]> {
        return this.coordRepo.getCoordinatoren(datum);
    }

    async saveMeting(body: CoordinatorMetingInput, gebruiker: Gebruiker): Promise<void> {
        const bad_id = await this.coordRepo.getBadId(body.bad_naam);
        await this.coordRepo.saveMeting(bad_id, body, bepaalAuteur(gebruiker));
        // Fire-and-forget: gebonden-chloor- en peuterbad-aftappen-acties (geen transactionele garantie vereist)
        void this.actiesRepo.genereerCoordinatoren(body.datum);
    }

    getChecklist(datum: string): Promise<Checklist> {
        return this.coordRepo.getChecklist(datum);
    }

    saveChecklist(datum: string, body: ChecklistInput): Promise<void> {
        return this.coordRepo.saveChecklist(datum, body);
    }

    getDaggegevens(datum: string): Promise<Daggegevens> {
        return this.coordRepo.getDaggegevens(datum);
    }

    async saveDaggegevens(datum: string, body: DaggegevensInput): Promise<void> {
        await this.coordRepo.saveDaggegevens(datum, body);
        // Fire-and-forget: geen transactionele garantie vereist
        void this.actiesRepo.genereerBezoekers(datum, body.bezoekers_vandaag ?? null);
        void this.actiesRepo.genereerSpoelbeurt(datum);
    }

    async deleteBlok(datum: string, tijdstip: string): Promise<void> {
        await this.coordRepo.deleteBlok(datum, tijdstip);
        // Fire-and-forget: leid gebonden-chloor- en aftap-acties opnieuw af nu een blok weg is
        void this.actiesRepo.genereerCoordinatoren(datum);
    }

    getLogboek(datum: string): Promise<LogboekEntry[]> {
        return this.logboekRepo.getByDatum(datum);
    }

    async saveLogboek(datum: string, tijdstip: string, tekst: string, gebruiker: Gebruiker): Promise<LogboekOpslaanResultaat> {
        const auteur = bepaalAuteur(gebruiker);
        const row = await this.logboekRepo.save(datum, tijdstip, tekst, auteur);
        return { id: row?.id ?? null, auteur: row?.auteur ?? auteur };
    }

    deleteLogboek(id: string): Promise<void> {
        return this.logboekRepo.deleteById(id);
    }
}
