import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CoordinatorBlok, CoordinatorMeting, CoordinatorMetingInput,
         Checklist, ChecklistInput, Daggegevens, DaggegevensInput } from '../types';
import { ICoordinatorenRepository } from './ICoordinatorenRepository';
import { AppError } from '../errors';

export class CoordinatorenRepository implements ICoordinatorenRepository {
    constructor(private readonly pool: Pool) {}

    async getCoordinatoren(datum: string): Promise<CoordinatorBlok[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT b.naam AS bad_naam, mc.tijdstip, mc.auteur,
                    mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal,
                    mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt
             FROM metingen_coordinatoren mc
             JOIN baden b ON b.id = mc.bad_id
             WHERE mc.datum = ?
             ORDER BY mc.tijdstip ASC, b.id ASC`,
            [datum]
        );

        const blokken = new Map<string, CoordinatorBlok>();
        for (const row of rows as Array<CoordinatorMeting & { tijdstip: string; auteur: string | null }>) {
            if (!blokken.has(row.tijdstip)) {
                blokken.set(row.tijdstip, { tijdstip: row.tijdstip, auteur: row.auteur ?? '', metingen: [] });
            }
            blokken.get(row.tijdstip)!.metingen.push({
                bad_naam:         row.bad_naam,
                ph_waarde:        row.ph_waarde,
                chloor_vrij:      row.chloor_vrij,
                chloor_totaal:    row.chloor_totaal,
                watertemperatuur: row.watertemperatuur,
                helderheid:       row.helderheid,
                bad_gebruikt:     row.bad_gebruikt,
            });
        }
        return Array.from(blokken.values());
    }

    async getBadId(bad_naam: string): Promise<number> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id FROM baden WHERE naam = ?', [bad_naam]
        );
        if (rows.length === 0) throw new AppError('Bad niet gevonden', 400);
        return (rows[0] as { id: number }).id;
    }

    async saveMeting(bad_id: number, data: CoordinatorMetingInput, auteur: string | null): Promise<void> {
        const { datum, tijdstip, ph_waarde, chloor_vrij, chloor_totaal,
                watertemperatuur, helderheid, bad_gebruikt } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO metingen_coordinatoren
               (bad_id, datum, tijdstip, auteur, ph_waarde, chloor_vrij, chloor_totaal, watertemperatuur, helderheid, bad_gebruikt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               ph_waarde        = VALUES(ph_waarde),
               chloor_vrij      = VALUES(chloor_vrij),
               chloor_totaal    = VALUES(chloor_totaal),
               watertemperatuur = VALUES(watertemperatuur),
               helderheid       = VALUES(helderheid),
               bad_gebruikt     = VALUES(bad_gebruikt)`,
            [bad_id, datum, tijdstip || '00:00:00', auteur,
             ph_waarde ?? null, chloor_vrij ?? null, chloor_totaal ?? null,
             watertemperatuur ?? null, helderheid ?? null, bad_gebruikt ?? null]
        );
    }

    async deleteBlok(datum: string, tijdstip: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            'DELETE FROM metingen_coordinatoren WHERE datum = ? AND tijdstip = ?',
            [datum, tijdstip]
        );
    }

    async getChecklist(datum: string): Promise<Checklist> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur FROM coordinatoren_checklist WHERE datum = ?',
            [datum]
        );
        return (rows[0] as Checklist) ?? { proef_waterspeel: 0, proef_spraypark: 0, proef_douches: 0, proef_glijbaan: 0, auteur: null };
    }

    async saveChecklist(datum: string, data: ChecklistInput, auteur: string | null): Promise<void> {
        const { proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO coordinatoren_checklist (datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               proef_waterspeel = VALUES(proef_waterspeel),
               proef_spraypark  = VALUES(proef_spraypark),
               proef_douches    = VALUES(proef_douches),
               proef_glijbaan   = VALUES(proef_glijbaan),
               auteur           = VALUES(auteur)`,
            [datum,
             proef_waterspeel ? 1 : 0, proef_spraypark ? 1 : 0,
             proef_douches ? 1 : 0, proef_glijbaan ? 1 : 0, auteur]
        );
    }

    async getDaggegevens(datum: string): Promise<Daggegevens> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt, auteur FROM coordinatoren_daggegevens WHERE datum = ?',
            [datum]
        );
        return (rows[0] as Daggegevens) ?? { lucht_temperatuur: null, bezoekers_vandaag: null, bezoekers_totaal_spoelbeurt: null, auteur: null };
    }

    async saveDaggegevens(datum: string, data: DaggegevensInput, auteur: string | null): Promise<void> {
        const { lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO coordinatoren_daggegevens (datum, lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt, auteur)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               lucht_temperatuur           = VALUES(lucht_temperatuur),
               bezoekers_vandaag           = VALUES(bezoekers_vandaag),
               bezoekers_totaal_spoelbeurt = VALUES(bezoekers_totaal_spoelbeurt),
               auteur                      = VALUES(auteur)`,
            [datum, lucht_temperatuur ?? null, bezoekers_vandaag ?? null, bezoekers_totaal_spoelbeurt ?? null, auteur]
        );
    }
}
