import { IDienstRepository } from '../repositories/IDienstRepository';
import { IGebruikersRepository } from '../repositories/IGebruikersRepository';
import { IDienstService } from './IDienstService';
import { WaterbeheerDienst, WaterbeheerDienstInput } from '../types';

/** Bedrijfslogica voor de waterbeheer-dienst (wie was er op dienst). */
export class DienstService implements IDienstService {
    constructor(
        private readonly dienstRepo: IDienstRepository,
        private readonly gebruikersRepo: IGebruikersRepository,
    ) {}

    getDienst(datum: string): Promise<WaterbeheerDienst> {
        return this.dienstRepo.getDienst(datum);
    }

    saveDienst(data: WaterbeheerDienstInput): Promise<void> {
        return this.dienstRepo.saveDienst(data);
    }

    /**
     * Namen voor de keuzelijst: iedereen die het waterbeheer-domein mag bewerken
     * (via een van zijn rollen). Dedupliceert en sorteert; lege namen vallen weg.
     */
    async getWaterbeheerders(): Promise<string[]> {
        const gebruikers = await this.gebruikersRepo.getMetRecht('waterbeheer', 'schrijven');
        const namen = gebruikers
            .map(g => [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam)
            .filter(naam => !!naam);
        return Array.from(new Set(namen)).sort((a, b) => a.localeCompare(b));
    }
}
