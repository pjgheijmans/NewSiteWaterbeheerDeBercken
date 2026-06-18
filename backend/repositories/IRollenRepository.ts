import { Rol, RolRechten } from '../types';

export interface RolInput {
    naam: string;
    mag_historie_bewerken: boolean;
    rechten: RolRechten;
}

export interface IRollenRepository {
    getAll(): Promise<Rol[]>;
    create(naam: string): Promise<void>;
    update(id: string, data: RolInput): Promise<void>;
    remove(id: string): Promise<void>;
}
