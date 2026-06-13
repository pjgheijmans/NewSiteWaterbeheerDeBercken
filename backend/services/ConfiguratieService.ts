import { IConfiguratieRepository } from '../repositories/IConfiguratieRepository';
import { IConfiguratieService } from './IConfiguratieService';
import { Configuratie } from '../types';
import { AppError } from '../errors';

/**
 * Bedrijfslogica voor de generieke configuratie. Houdt een in-memory cache zodat
 * veelgebruikte waarden (zoals de sessie-time-out) per request zonder DB-hit
 * beschikbaar zijn; de cache wordt bij elke `update` ververst zodat wijzigingen
 * direct (zonder herstart) doorwerken.
 */
export class ConfiguratieService implements IConfiguratieService {
    /** Defaults bepalen tevens welke sleutels geldig zijn (onbekende sleutel → 404). */
    private static readonly DEFAULTS: Record<string, string> = {
        sessie_timeout_minuten: '5',
    };

    /** Per-sleutel validatie; gooit AppError(400) bij een ongeldige waarde. */
    private static readonly VALIDATIE: Record<string, (waarde: string) => void> = {
        sessie_timeout_minuten: (waarde) => {
            const n = Number(waarde);
            if (!Number.isInteger(n) || n < 1 || n > 1440) {
                throw new AppError('Sessie-time-out moet een geheel getal tussen 1 en 1440 minuten zijn.', 400);
            }
        },
    };

    private readonly cache = new Map<string, string>();

    constructor(private readonly repo: IConfiguratieRepository) {}

    async laadCache(): Promise<void> {
        try {
            const rijen = await this.repo.getAll();
            this.cache.clear();
            rijen.forEach(r => this.cache.set(r.sleutel, r.waarde));
        } catch (err) {
            // Faalt zacht (DB nog niet beschikbaar / test-context): defaults blijven gelden.
            console.warn('Configuratie laden mislukt, gebruik defaults:', (err as Error).message);
        }
    }

    getAll(): Promise<Configuratie[]> {
        return this.repo.getAll();
    }

    private _waarde(sleutel: string): string {
        return this.cache.get(sleutel) ?? ConfiguratieService.DEFAULTS[sleutel];
    }

    getSessieTimeoutMs(): number {
        const minuten = parseInt(this._waarde('sessie_timeout_minuten'), 10);
        const veilig  = Number.isFinite(minuten) && minuten > 0 ? minuten : 5;
        return veilig * 60 * 1000;
    }

    async update(sleutel: string, waarde: string): Promise<void> {
        if (!(sleutel in ConfiguratieService.DEFAULTS)) {
            throw new AppError(`Onbekende configuratiesleutel: ${sleutel}`, 404);
        }
        ConfiguratieService.VALIDATIE[sleutel]?.(waarde);
        await this.repo.upsert(sleutel, waarde);
        this.cache.set(sleutel, waarde);
    }
}
