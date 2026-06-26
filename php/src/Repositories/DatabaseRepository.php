<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;
use Zwembad\Errors\AppError;

/**
 * Port van backend/repositories/DatabaseRepository.ts. Databasebeheer: export-
 * queries, init.sql uitvoeren, truncaten en standaardwaarden zaaien.
 */
class DatabaseRepository implements IDatabaseRepository
{
    /** Datatabellen voor truncateAll (volgorde respecteert FK-afhankelijkheden). */
    private const ALL_DATA_TABLES = [
        'logboek', 'coordinatoren_logboek', 'acties', 'metingen_diep_ondiep',
        'metingen_coordinatoren', 'coordinatoren_checklist', 'coordinatoren_daggegevens',
        'metingen_peuterbad', 'verbruik_diep_ondiep', 'verwarmings_systeem_diep_ondiep',
        'waterbeheer_dienst', 'limieten', 'gebruiker_rollen', 'gebruikers',
    ];

    /** Expliciete export-queries (bad_id → bad_naam, kolomvolgorde); fallback = SELECT *. */
    private const EXPORT_QUERIES = [
        'logboek' => 'SELECT id, datum, tijdstip, auteur, tekst FROM logboek ORDER BY datum DESC, tijdstip ASC',
        'coordinatoren_logboek' => 'SELECT id, datum, tijdstip, auteur, tekst FROM coordinatoren_logboek ORDER BY datum DESC, tijdstip ASC',
        'metingen_diep_ondiep' => 'SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit, m.kathodische_bescherming FROM metingen_diep_ondiep m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC',
        'metingen_peuterbad' => 'SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC',
        'metingen_coordinatoren' => 'SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.tijdstip, mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal, mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC, mc.tijdstip ASC',
        'coordinatoren_checklist' => 'SELECT datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur FROM coordinatoren_checklist ORDER BY datum DESC',
        'coordinatoren_daggegevens' => 'SELECT datum, lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt, auteur FROM coordinatoren_daggegevens ORDER BY datum DESC',
        'waterbeheer_dienst' => 'SELECT datum, dienst_1, dienst_2 FROM waterbeheer_dienst ORDER BY datum DESC',
        'verbruik_diep_ondiep' => 'SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC',
        'verwarmings_systeem_diep_ondiep' => 'SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem_diep_ondiep ORDER BY datum DESC',
        'acties' => 'SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC',
    ];

    public function __construct(
        private PDO $pdo,
        private ILimietenRepository $limietenRepo,
        private IGebruikersRepository $gebruikersRepo,
    ) {
    }

    public function exportRows(string $tabel): array
    {
        $query = self::EXPORT_QUERIES[$tabel] ?? "SELECT * FROM $tabel";

        return $this->pdo->query($query)->fetchAll();
    }

    public function runInitSql(): void
    {
        $sql = file_get_contents($this->vindInitSql());

        // Commentaarregels (-- ...) eruit, daarna naïef op ';' splitsen — exact zoals Node.
        $regels = [];
        foreach (preg_split('/\n/', $sql) as $line) {
            if (strncmp(ltrim($line), '--', 2) !== 0) {
                $regels[] = $line;
            }
        }
        foreach (explode(';', implode("\n", $regels)) as $stmt) {
            $stmt = trim($stmt);
            if ($stmt === '') {
                continue;
            }
            try {
                $this->pdo->exec($stmt);
            } catch (\Throwable $e) {
                error_log('init.sql statement warning: ' . substr($e->getMessage(), 0, 120));
            }
        }
    }

    public function truncate(string $tabel): void
    {
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $this->pdo->exec("TRUNCATE TABLE $tabel");
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function truncateAll(): void
    {
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach (self::ALL_DATA_TABLES as $tabel) {
            try {
                $this->pdo->exec("TRUNCATE TABLE $tabel");
            } catch (\Throwable $e) {
                error_log("truncateAll: skipping $tabel: " . substr($e->getMessage(), 0, 80));
            }
        }
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function seedAllDefaults(): void
    {
        $this->limietenRepo->seedDefaults();
        $this->gebruikersRepo->seedDefaults();
    }

    public function getBadId(string $badNaam): ?int
    {
        $stmt = $this->pdo->prepare('SELECT id FROM baden WHERE naam = ?');
        $stmt->execute([$badNaam]);
        $rij = $stmt->fetch();

        return $rij !== false ? (int) $rij['id'] : null;
    }

    public function importRow(string $actualTabel, array $columns, array $values): void
    {
        $cols = implode(', ', $columns);
        $plaatshouders = implode(', ', array_fill(0, count($columns), '?'));
        $updates = implode(', ', array_map(static fn (string $c): string => "$c = VALUES($c)", $columns));
        $this->pdo->prepare(
            "INSERT INTO $actualTabel ($cols) VALUES ($plaatshouders) ON DUPLICATE KEY UPDATE $updates",
        )->execute($values);
    }

    public function setForeignKeyChecks(bool $on): void
    {
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = ' . ($on ? '1' : '0'));
    }

    /** Zoek init.sql: repo-root (dev/Docker) of meegeleverd in php/ (deploy). */
    private function vindInitSql(): string
    {
        $kandidaten = [
            dirname(__DIR__, 3) . '/init.sql', // repo-root
            dirname(__DIR__, 2) . '/init.sql', // php/init.sql (kopieer hierheen bij deploy)
        ];
        foreach ($kandidaten as $pad) {
            if (is_file($pad)) {
                return $pad;
            }
        }
        throw new AppError('init.sql niet gevonden (verwacht in de project-root of in php/).', 500);
    }
}
