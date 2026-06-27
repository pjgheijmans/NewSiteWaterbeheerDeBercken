<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use DI\ContainerBuilder;
use PDO;
use PHPUnit\Framework\TestCase;
use Zwembad\Repositories\IDatabaseRepository;

/**
 * Basis voor integratietests: draait tegen een ECHTE MySQL (de db-container).
 *
 * Isolatie zónder een omhullende transactie (sommige repositories openen hun eigen
 * transactie, en MySQL kent geen geneste transacties): elke test gebruikt
 * test-specifieke sleutels — toekomstige datums (2099) en `itest_`/`ITest `-prefixen —
 * die in setUp én tearDown worden opgeruimd. Echte data blijft ongemoeid.
 *
 * Vereist de DB-omgevingsvariabelen (DB_HOST=db, …); in de php-container staan die al.
 */
abstract class IntegrationTestCase extends TestCase
{
    protected static PDO $pdo;
    private static bool $schemaKlaar = false;

    /** Test-datums (ver in de toekomst zodat ze niet met echte data botsen). */
    protected const D1 = '2099-12-31';
    protected const D2 = '2099-12-30';

    /** @var list<string> Datum-gekoppelde tabellen die per test worden opgeschoond. */
    private const DATUM_TABELLEN = [
        'acties', 'metingen_diep_ondiep', 'metingen_peuterbad', 'metingen_coordinatoren',
        'verbruik_diep_ondiep', 'verwarmings_systeem_diep_ondiep', 'waterbeheer_dienst',
        'coordinatoren_checklist', 'coordinatoren_daggegevens', 'coordinatoren_logboek',
        'logboek', 'rondetaken_voltooid',
    ];

    public static function setUpBeforeClass(): void
    {
        $container = self::container();
        self::$pdo = $container->get(PDO::class);

        if (!self::$schemaKlaar) {
            // Schema zeker stellen (idempotent; de container doet dit ook bij opstart).
            $container->get(IDatabaseRepository::class)->runInitSql();
            self::$schemaKlaar = true;
        }
    }

    protected function setUp(): void
    {
        $this->ruimTestdataOp();
    }

    protected function tearDown(): void
    {
        $this->ruimTestdataOp();
    }

    protected function badId(string $naam): int
    {
        $stmt = self::$pdo->prepare('SELECT id FROM baden WHERE naam = ?');
        $stmt->execute([$naam]);

        return (int) $stmt->fetchColumn();
    }

    protected function ruimTestdataOp(): void
    {
        foreach (self::DATUM_TABELLEN as $tabel) {
            self::$pdo->exec("DELETE FROM $tabel WHERE datum >= '2099-01-01'");
        }
        self::$pdo->exec("DELETE FROM gebruikers WHERE inlognaam LIKE 'itest\\_%'");
        self::$pdo->exec("DELETE FROM rollen WHERE naam LIKE 'ITest %'");
        self::$pdo->exec("DELETE FROM limieten WHERE parameter_naam LIKE 'itest\\_%'");
    }

    private static function container(): \Psr\Container\ContainerInterface
    {
        $builder = new ContainerBuilder();
        $builder->addDefinitions(self::definities());

        return $builder->build();
    }

    /**
     * Config-definities één keer inladen (require van een file met `return` levert
     * bij een tweede require slechts `1` op; settings.php declareert ook env()).
     * @return array<string,mixed>
     */
    private static function definities(): array
    {
        static $defs = null;
        if ($defs === null) {
            $defs = array_merge(
                require dirname(__DIR__, 2) . '/config/settings.php',
                require dirname(__DIR__, 2) . '/config/dependencies.php',
            );
        }

        return $defs;
    }
}
