import { LimietenMap, LimietInput } from '../types';

export interface ILimietenService {
    getAll(): Promise<LimietenMap>;
    getDefaults(): LimietenMap;
    save(data: LimietInput): Promise<void>;
}
