import { IMetingenRepository } from '../repositories/IMetingenRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { IDaggegevensProvider } from '../repositories/IDaggegevensProvider';
import { IMetingenService } from './IMetingenService';
import { bepaalAuteur } from '../auteur';
import { Meting, MetingInput, Actie, Gebruiker, BezoekersResultaat, GebondenChloorResultaat } from '../types';

/**
 * Bedrijfslogica voor metingen en acties.
 * Beslist welke bad-tabel gebruikt wordt en orkestreert actiegeneratie.
 */
export class MetingenService implements IMetingenService {
    constructor(
        private readonly metingenRepo: IMetingenRepository,
        private readonly actiesRepo: IActiesRepository,
        private readonly daggegevensProvider: IDaggegevensProvider,
    ) {}

    getMetingen(datum: string): Promise<Meting[]> {
        return this.metingenRepo.getMetingen(datum);
    }

    async saveMeting(body: MetingInput): Promise<void> {
        const bad_id = await this.metingenRepo.getBadId(body.bad_naam);
        if (body.bad_naam === 'Peuterbad') {
            await this.metingenRepo.savePeuterbadMeting(bad_id, body);
        } else {
            await this.metingenRepo.saveGrootBadMeting(bad_id, body);
        }
        await this.actiesRepo.genereer(bad_id, body.datum, body.bad_naam, body);
    }

    getActies(datum: string): Promise<Actie[]> {
        return this.actiesRepo.getActies(datum);
    }

    resolveActie(id: string, gebruiker: Gebruiker): Promise<void> {
        return this.actiesRepo.resolve(id, bepaalAuteur(gebruiker));
    }

    unresolveActie(id: string): Promise<void> {
        return this.actiesRepo.unresolve(id);
    }

    async getBezoekers(datum: string): Promise<BezoekersResultaat> {
        const dag = await this.daggegevensProvider.getDaggegevens(datum);
        // Fire-and-forget: geen transactionele garantie vereist
        void this.actiesRepo.genereerBezoekers(datum, dag.bezoekers_vandaag ?? null);
        const totalen = await this.actiesRepo.genereerSpoelbeurt(datum);
        return {
            bezoekers_vandaag:       dag.bezoekers_vandaag ?? null,
            bezoekers_totaal_diep:   totalen.diep          ?? null,
            bezoekers_totaal_ondiep: totalen.ondiep        ?? null,
        };
    }

    async getGebondenChloor(datum: string): Promise<GebondenChloorResultaat> {
        // Fire-and-forget: herleid de gebonden-chloor-acties op basis van de
        // huidige coordinator-metingen (geen transactionele garantie vereist).
        void this.actiesRepo.genereerCoordinatoren(datum);
        return this.actiesRepo.getGebondenChloorMax(datum);
    }
}
