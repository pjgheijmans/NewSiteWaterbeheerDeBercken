import { LimietenMap, LimietInput } from '../types';

export interface ILimietenRepository {
    getAll(): Promise<LimietenMap>;
    getDefaults(): LimietenMap;
    seedDefaults(): Promise<void>;
    save(data: LimietInput): Promise<void>;
}
