import { ILimietenRepository } from '../repositories/ILimietenRepository';
import { ILimietenService } from './ILimietenService';
import { LimietenMap, LimietInput } from '../types';

/** Bedrijfslogica voor limieten/grenswaarden. */
export class LimietenService implements ILimietenService {
    constructor(private readonly repo: ILimietenRepository) {}

    getAll(): Promise<LimietenMap> {
        return this.repo.getAll();
    }

    getDefaults(): LimietenMap {
        return this.repo.getDefaults();
    }

    save(data: LimietInput): Promise<void> {
        return this.repo.save(data);
    }
}
