<?php

declare(strict_types=1);

/**
 * Database-bootstrap: voert init.sql uit via de app (DatabaseRepository::runInitSql),
 * dat elk statement in een try/catch draait. Dat is nodig omdat init.sql bewuste
 * dubbele `ALTER TABLE ... ADD COLUMN`-migraties bevat: de MySQL-client (en dus
 * `mysql < init.sql` of docker-entrypoint-initdb.d) breekt af op de eerste
 * "Duplicate column"-fout, waardoor het schema half blijft. runInitSql() slikt die
 * fouten en maakt het schema compleet (+ seed-accounts via INSERT IGNORE in init.sql).
 *
 * Idempotent — veilig om bij elke containerstart te draaien. Productie: één keer
 * uitvoeren bij deploy (`php bin/init-db.php`) i.p.v. `mysql < init.sql`.
 */

require __DIR__ . '/../vendor/autoload.php';

use DI\ContainerBuilder;
use Zwembad\Repositories\IDatabaseRepository;

$builder = new ContainerBuilder();
$builder->addDefinitions(require __DIR__ . '/../config/settings.php');
$builder->addDefinitions(require __DIR__ . '/../config/dependencies.php');
$container = $builder->build();

// Wacht kort op de database (de container kan net opgestart zijn).
$pdo = null;
for ($i = 1; $i <= 30; $i++) {
    try {
        $pdo = $container->get(PDO::class);
        $pdo->query('SELECT 1');
        break;
    } catch (\Throwable $e) {
        echo "Wachten op database ($i/30)...\n";
        sleep(2);
        $pdo = null;
    }
}
if ($pdo === null) {
    fwrite(STDERR, "Database niet bereikbaar — init overgeslagen.\n");
    exit(1);
}

echo "init.sql uitvoeren (per statement; dubbele kolommen worden genegeerd)...\n";
$container->get(IDatabaseRepository::class)->runInitSql();
echo "Schema + seed-accounts klaar.\n";
