import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { AppError } from '../errors';
import { OpslaanResultaat } from '../types';

/** Bericht bij een verlies-van-update (twee gebruikers wijzigden hetzelfde record). */
export const CONFLICT_BERICHT = 'Iemand anders heeft deze gegevens ondertussen gewijzigd.';

/**
 * Optimistische "upsert" met versiecontrole voor een record met een unieke sleutel.
 *
 * - `verwachteVersie === null` betekent: de client zag nog geen record (nieuw record).
 * - Komt de verwachte versie niet (meer) overeen, dan heeft een ander de gegevens
 *   gewijzigd → AppError(409). Zo wordt een stille "lost update" een zichtbaar,
 *   herstelbaar conflict.
 *
 * Geeft de nieuwe meta (versie/auteur/bijgewerkt_op) terug, zodat de client kan
 * doortellen en zijn "laatst gewijzigd"-weergave kan bijwerken.
 *
 * NB: tabel- en kolomnamen komen uitsluitend uit (vaste) repository-code, nooit uit
 * gebruikersinvoer; alle waarden gaan via prepared-statement-parameters.
 */
/** Toegestane SQL-parameterwaarden voor onze upserts. */
type Waarde = string | number | null;

export async function optimistischOpslaan(
    pool: Pool,
    tabel: string,
    sleutel: Record<string, Waarde>,
    velden: Record<string, Waarde>,
    auteur: string | null,
    verwachteVersie: number | null,
): Promise<OpslaanResultaat> {
    const sleutelKol = Object.keys(sleutel);
    const sleutelWrd = Object.values(sleutel);
    const where = sleutelKol.map((k) => `${k} = ?`).join(' AND ');

    const veldKol = Object.keys(velden);
    const veldWrd = Object.values(velden);

    // 1) Conditionele UPDATE op de verwachte versie. De rij-lock van MySQL serialiseert
    //    gelijktijdige writes: maar één van twee gelijktijdige saves matcht versie=N.
    const setClause = veldKol.map((k) => `${k} = ?`).join(', ');
    const [upd] = await pool.execute<ResultSetHeader>(
        `UPDATE ${tabel} SET ${setClause}, auteur = ?, versie = versie + 1 WHERE ${where} AND versie = ?`,
        [...veldWrd, auteur, ...sleutelWrd, verwachteVersie ?? -1],
    );
    if (upd.affectedRows === 1) return leesMeta(pool, tabel, where, sleutelWrd);

    // 2) Geen match. Bestaat het record (dan met een andere versie) → conflict.
    const [bestaande] = await pool.execute<RowDataPacket[]>(
        `SELECT versie FROM ${tabel} WHERE ${where}`,
        sleutelWrd,
    );
    if (bestaande.length > 0) throw new AppError(CONFLICT_BERICHT, 409);

    // 3) Record bestaat niet, maar de client verwachtte er wél een → verdwenen → conflict.
    if (verwachteVersie !== null) throw new AppError(CONFLICT_BERICHT, 409);

    // 4) Echt nieuw record. Een gelijktijdige insert geeft een duplicate key → conflict.
    try {
        await pool.execute<ResultSetHeader>(
            `INSERT INTO ${tabel} (${[...sleutelKol, ...veldKol, 'auteur', 'versie'].join(', ')})
             VALUES (${[...sleutelWrd, ...veldWrd, null].map(() => '?').join(', ')}, 1)`,
            [...sleutelWrd, ...veldWrd, auteur],
        );
    } catch (e) {
        if ((e as { code?: string }).code === 'ER_DUP_ENTRY')
            throw new AppError(CONFLICT_BERICHT, 409);
        throw e;
    }
    return leesMeta(pool, tabel, where, sleutelWrd);
}

async function leesMeta(
    pool: Pool,
    tabel: string,
    where: string,
    sleutelWrd: Waarde[],
): Promise<OpslaanResultaat> {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT versie, auteur, DATE_FORMAT(bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
         FROM ${tabel} WHERE ${where}`,
        sleutelWrd,
    );
    const r =
        (rows[0] as { versie?: number; auteur?: string | null; bijgewerkt_op?: string | null }) ??
        {};
    return {
        versie: Number(r.versie ?? 0),
        auteur: r.auteur ?? null,
        bijgewerkt_op: r.bijgewerkt_op ?? null,
    };
}
