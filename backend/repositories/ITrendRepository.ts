import { TrendMetingRow, TrendVerbruikResult } from '../types';

export interface ITrendRepository {
    getMetingenTrend(van: string, tot: string): Promise<TrendMetingRow[]>;
    getVerbruikTrend(van: string, tot: string): Promise<TrendVerbruikResult>;
}
