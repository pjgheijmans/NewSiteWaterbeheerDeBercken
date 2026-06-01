import { ITrendRepository } from '../repositories/ITrendRepository';
import { ITrendService } from './ITrendService';
import { TrendMetingRow, TrendVerbruikResult } from '../types';

/** Bedrijfslogica voor trendanalyse. */
export class TrendService implements ITrendService {
    constructor(private readonly repo: ITrendRepository) {}

    getMetingenTrend(van: string, tot: string): Promise<TrendMetingRow[]> {
        return this.repo.getMetingenTrend(van, tot);
    }

    getVerbruikTrend(van: string, tot: string): Promise<TrendVerbruikResult> {
        return this.repo.getVerbruikTrend(van, tot);
    }
}
