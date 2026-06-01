import { TrendMetingRow, TrendVerbruikResult } from '../types';

export interface ITrendService {
    getMetingenTrend(van: string, tot: string): Promise<TrendMetingRow[]>;
    getVerbruikTrend(van: string, tot: string): Promise<TrendVerbruikResult>;
}
