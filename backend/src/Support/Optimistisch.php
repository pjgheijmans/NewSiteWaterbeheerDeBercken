<?php

declare(strict_types=1);

namespace Zwembad\Support;

use PDO;
use PDOException;
use Zwembad\Errors\AppError;

/**
 * Optimistische "upsert" met versiecontrole — port van backend/repositories/optimistisch.ts.
 *
 * - $verwachteVersie === null betekent: de client zag nog geen record (nieuw record).
 * - Komt de verwachte versie niet (meer) overeen → AppError(409): een stille
 *   "lost update" wordt zo een zichtbaar, herstelbaar conflict.
 *
 * Geeft de nieuwe meta (versie/auteur/bijgewerkt_op) terug.
 *
 * NB: tabel-/kolomnamen komen uitsluitend uit (vaste) repository-code, nooit uit
 * gebruikersinvoer; alle waarden gaan via prepared-statement-parameters.
 */
final class Optimistisch
{
    /** Bericht bij verlies-van-update (twee gebruikers wijzigden hetzelfde record). */
    public const CONFLICT_BERICHT = 'Iemand anders heeft deze gegevens ondertussen gewijzigd.';

    /**
     * @param array<string,string|int|float|null> $sleutel
     * @param array<string,string|int|float|null> $velden
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public static function opslaan(
        PDO $pdo,
        string $tabel,
        array $sleutel,
        array $velden,
        ?string $auteur,
        ?int $verwachteVersie,
    ): array {
        $sleutelKol = array_keys($sleutel);
        $sleutelWrd = array_values($sleutel);
        $where = implode(' AND ', array_map(static fn ($k): string => "$k = ?", $sleutelKol));

        $veldKol = array_keys($velden);
        $veldWrd = array_values($velden);

        // 1) Conditionele UPDATE op de verwachte versie. De rij-lock serialiseert
        //    gelijktijdige writes: maar één van twee matcht versie = N.
        $setClause = implode(', ', array_map(static fn ($k): string => "$k = ?", $veldKol));
        $upd = $pdo->prepare(
            "UPDATE $tabel SET $setClause, auteur = ?, versie = versie + 1 WHERE $where AND versie = ?",
        );
        $upd->execute([...$veldWrd, $auteur, ...$sleutelWrd, $verwachteVersie ?? -1]);
        if ($upd->rowCount() === 1) {
            return self::leesMeta($pdo, $tabel, $where, $sleutelWrd);
        }

        // 2) Geen match. Bestaat het record (met andere versie) → conflict.
        $check = $pdo->prepare("SELECT versie FROM $tabel WHERE $where");
        $check->execute($sleutelWrd);
        if ($check->fetch() !== false) {
            throw new AppError(self::CONFLICT_BERICHT, 409);
        }

        // 3) Record bestaat niet, maar de client verwachtte er wél een → verdwenen → conflict.
        if ($verwachteVersie !== null) {
            throw new AppError(self::CONFLICT_BERICHT, 409);
        }

        // 4) Echt nieuw record. Een gelijktijdige insert geeft een duplicate key → conflict.
        $kolommen = implode(', ', [...$sleutelKol, ...$veldKol, 'auteur', 'versie']);
        $plaatshouders = implode(', ', array_fill(0, count($sleutelWrd) + count($veldWrd) + 1, '?'));
        try {
            $ins = $pdo->prepare("INSERT INTO $tabel ($kolommen) VALUES ($plaatshouders, 1)");
            $ins->execute([...$sleutelWrd, ...$veldWrd, $auteur]);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) { // ER_DUP_ENTRY
                throw new AppError(self::CONFLICT_BERICHT, 409);
            }
            throw $e;
        }

        return self::leesMeta($pdo, $tabel, $where, $sleutelWrd);
    }

    /**
     * @param array<int,string|int|float|null> $sleutelWrd
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    private static function leesMeta(PDO $pdo, string $tabel, string $where, array $sleutelWrd): array
    {
        $stmt = $pdo->prepare(
            "SELECT versie, auteur, DATE_FORMAT(bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
             FROM $tabel WHERE $where",
        );
        $stmt->execute($sleutelWrd);
        $r = $stmt->fetch() ?: [];

        return [
            'versie' => (int) ($r['versie'] ?? 0),
            'auteur' => $r['auteur'] ?? null,
            'bijgewerkt_op' => $r['bijgewerkt_op'] ?? null,
        ];
    }
}
