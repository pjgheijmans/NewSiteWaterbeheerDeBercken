<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Errors\AppError;
use Zwembad\Support\Optimistisch;

/**
 * Integratietest voor de optimistische versiecontrole tegen een echte tabel.
 */
final class OptimistischTest extends IntegrationTestCase
{
    public function testInsertUpdateEnStaleConflict(): void
    {
        $sleutel = ['bad_id' => $this->badId('Diep'), 'datum' => self::D1];

        // 1) Nieuw record (verwachteVersie null) → versie 1.
        $r1 = Optimistisch::opslaan(self::$pdo, 'metingen_diep_ondiep', $sleutel, ['ph_waarde' => 7.0], 'tester', null);
        self::assertSame(1, $r1['versie']);
        self::assertSame('tester', $r1['auteur']);

        // 2) Update op de juiste versie → versie 2.
        $r2 = Optimistisch::opslaan(self::$pdo, 'metingen_diep_ondiep', $sleutel, ['ph_waarde' => 7.2], 'tester2', 1);
        self::assertSame(2, $r2['versie']);
        self::assertSame('tester2', $r2['auteur']);

        // 3) Update op een verouderde versie → 409 (lost update voorkomen).
        try {
            Optimistisch::opslaan(self::$pdo, 'metingen_diep_ondiep', $sleutel, ['ph_waarde' => 9.9], 'tester3', 1);
            self::fail('Verwachtte een 409-conflict');
        } catch (AppError $e) {
            self::assertSame(409, $e->getStatus());
        }

        // De waarde van de winnende update (7.2) staat er nog; de stale is geweigerd.
        $stmt = self::$pdo->prepare('SELECT ph_waarde, versie FROM metingen_diep_ondiep WHERE bad_id = ? AND datum = ?');
        $stmt->execute([$sleutel['bad_id'], self::D1]);
        $rij = $stmt->fetch();
        self::assertSame(7.2, (float) $rij['ph_waarde']);
        self::assertSame(2, (int) $rij['versie']);
    }

    public function testVerwachteVersieOpOntbrekendRecordIsConflict(): void
    {
        $this->expectException(AppError::class);
        $this->expectExceptionCode(409);

        // Client verwacht versie 5, maar het record bestaat (nog) niet → conflict.
        Optimistisch::opslaan(
            self::$pdo,
            'metingen_diep_ondiep',
            ['bad_id' => $this->badId('Diep'), 'datum' => self::D2],
            ['ph_waarde' => 7.0],
            'tester',
            5,
        );
    }
}
