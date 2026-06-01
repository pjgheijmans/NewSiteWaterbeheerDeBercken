import { IDatabaseRepository } from '../repositories/IDatabaseRepository';
import { IDatabaseService } from './IDatabaseService';
import { AppError } from '../errors';

/** Tabellen waarvoor bad_naam tijdens import naar bad_id moet worden vertaald. */
const NEED_BAD_ID = ['metingen_diep_ondiep', 'metingen_coordinatoren', 'metingen_peuterbad'];

/**
 * Bedrijfslogica voor databasebeheer: CSV-export/import (parsing en opbouw),
 * truncate en (her)initialisatie.
 */
export class DatabaseService implements IDatabaseService {
    constructor(private readonly repo: IDatabaseRepository) {}

    async exporteerCsv(tabel: string): Promise<string | null> {
        const rows = await this.repo.exportRows(tabel);
        if (rows.length === 0) return null;

        const kolommen = Object.keys(rows[0]);
        let csv = kolommen.join(';') + '\r\n';
        rows.forEach(rij => {
            csv += kolommen.map(k => {
                const w = rij[k];
                if (w === null || w === undefined) return '';
                if (w instanceof Date) return w.toISOString().split('T')[0];
                return String(w).replace(/;/g, ',');
            }).join(';') + '\r\n';
        });
        return csv;
    }

    async importeerCsv(tabel: string, ruweTekst: string): Promise<void> {
        if (!ruweTekst) throw new AppError('Geen CSV data ontvangen', 400);
        const regels = ruweTekst.split(/\r?\n/).filter(l => l.trim() !== '');
        if (regels.length < 2) throw new AppError('CSV-bestand bevat geen data', 400);

        const kolommen = regels[0].split(';');
        try {
            await this.repo.setForeignKeyChecks(false);
            for (const regel of regels.slice(1)) {
                const waarden = regel.split(';');
                if (waarden.length !== kolommen.length) continue;

                const rij: Record<string, string | null> = {};
                kolommen.forEach((k, i) => { rij[k] = waarden[i].trim() || null; });

                if (NEED_BAD_ID.includes(tabel)) {
                    const bad_id = await this.repo.getBadId(rij['bad_naam'] ?? '');
                    if (bad_id) rij['bad_id'] = String(bad_id);
                    delete rij['bad_naam'];
                }

                const cols = Object.keys(rij).filter(k => k !== 'id');
                await this.repo.importRow(tabel, cols, cols.map(k => rij[k]));
            }
            await this.repo.setForeignKeyChecks(true);
        } catch (err) {
            // FK-checks weer inschakelen vóór de fout doorgegooid wordt, zodat de DB-staat consistent blijft
            await this.repo.setForeignKeyChecks(true);
            throw err;
        }
    }

    truncate(tabel: string): Promise<void> {
        return this.repo.truncate(tabel);
    }

    wisAlles(): Promise<void> {
        return this.repo.truncateAll();
    }

    async initialiseer(): Promise<void> {
        await this.repo.runInitSql();
        await this.repo.truncateAll();
        await this.repo.seedAllDefaults();
    }
}
