import { CoordinatorBlok, CoordinatorMetingInput, Checklist, ChecklistInput,
         Daggegevens, DaggegevensInput, LogboekEntry, LogboekOpslaanResultaat, Gebruiker } from '../types';

export interface ICoordinatorenService {
    getCoordinatoren(datum: string): Promise<CoordinatorBlok[]>;
    saveMeting(body: CoordinatorMetingInput, gebruiker: Gebruiker): Promise<void>;
    getChecklist(datum: string): Promise<Checklist>;
    saveChecklist(datum: string, body: ChecklistInput): Promise<void>;
    getDaggegevens(datum: string): Promise<Daggegevens>;
    saveDaggegevens(datum: string, body: DaggegevensInput): Promise<void>;
    deleteBlok(datum: string, tijdstip: string): Promise<void>;
    getLogboek(datum: string): Promise<LogboekEntry[]>;
    saveLogboek(datum: string, tijdstip: string, tekst: string, gebruiker: Gebruiker): Promise<LogboekOpslaanResultaat>;
    deleteLogboek(id: string): Promise<void>;
}
