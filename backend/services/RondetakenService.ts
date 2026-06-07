import { IRondetakenRepository } from '../repositories/IRondetakenRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { IRondetakenService } from './IRondetakenService';
import { bepaalAuteur } from '../auteur';
import { RondetakenRepository } from '../repositories/RondetakenRepository';
import { Rondetaak, Gebruiker } from '../types';

/** Bedrijfslogica voor de dagelijkse rondetaken; berekent de uitvoerende auteur. */
export class RondetakenService implements IRondetakenService {
    constructor(
        private readonly repo: IRondetakenRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {}

    getRondetaken(datum: string): Promise<Rondetaak[]> {
        return this.repo.getRondetaken(datum);
    }

    /**
     * Vink een rondetaak af. Voor een filter-rondetaak (diep/ondiep/peuterbad)
     * worden ook alle openstaande filter_spoelen_*-acties van dat bad afgehandeld
     * (tweerichtingskoppeling met de Acties-tab).
     */
    async voltooi(sleutel: string, datum: string, gebruiker: Gebruiker): Promise<void> {
        const auteur = bepaalAuteur(gebruiker);
        await this.repo.voltooi(sleutel, datum, auteur);
        const badNaam = RondetakenRepository.badVoorFilterSleutel(sleutel);
        if (badNaam) await this.actiesRepo.resolveFilterSpoelen(badNaam, datum, auteur);
    }

    /** Vink een rondetaak uit; voor een filter-rondetaak heropent dit ook de filter_spoelen_*-acties. */
    async heropen(sleutel: string, datum: string): Promise<void> {
        await this.repo.heropen(sleutel, datum);
        const badNaam = RondetakenRepository.badVoorFilterSleutel(sleutel);
        if (badNaam) await this.actiesRepo.unresolveFilterSpoelen(badNaam, datum);
    }
}
