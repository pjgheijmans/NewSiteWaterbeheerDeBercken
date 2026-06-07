import { TaakItem } from '../types';

export interface ITakenService {
    /** Samengestelde taken-/actielijst voor een dag (rondetaken + acties, per bad-pagina). */
    getTaken(datum: string): Promise<TaakItem[]>;
}
