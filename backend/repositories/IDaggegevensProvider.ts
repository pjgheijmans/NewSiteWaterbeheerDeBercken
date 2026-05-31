import { Daggegevens } from '../types';

/** Minimale interface voor het ophalen van daggegevens — voldoende voor MetingenController. */
export interface IDaggegevensProvider {
    getDaggegevens(datum: string): Promise<Daggegevens>;
}
