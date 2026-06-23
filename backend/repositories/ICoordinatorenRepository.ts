import { IDaggegevensProvider } from './IDaggegevensProvider';
import {
    CoordinatorBlok,
    CoordinatorMetingInput,
    Checklist,
    ChecklistInput,
    Daggegevens,
    DaggegevensInput,
} from '../types';

export interface ICoordinatorenRepository extends IDaggegevensProvider {
    getCoordinatoren(datum: string): Promise<CoordinatorBlok[]>;
    getBadId(bad_naam: string): Promise<number>;
    saveMeting(bad_id: number, data: CoordinatorMetingInput, auteur: string | null): Promise<void>;
    deleteBlok(datum: string, tijdstip: string): Promise<void>;
    getChecklist(datum: string): Promise<Checklist>;
    saveChecklist(datum: string, data: ChecklistInput, auteur: string | null): Promise<void>;
    getDaggegevens(datum: string): Promise<Daggegevens>;
    saveDaggegevens(datum: string, data: DaggegevensInput, auteur: string | null): Promise<void>;
}
