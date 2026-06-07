import { ActieTekst, ActieTekstInput } from '../types';

export interface IActieTekstenService {
    getAll(): Promise<ActieTekst[]>;
    getDefaults(): ActieTekst[];
    save(data: ActieTekstInput): Promise<void>;
}
