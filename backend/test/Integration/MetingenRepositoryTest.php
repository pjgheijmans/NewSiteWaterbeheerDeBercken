<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Errors\AppError;
use Zwembad\Repositories\MetingenRepository;

final class MetingenRepositoryTest extends IntegrationTestCase
{
    private function repo(): MetingenRepository
    {
        return new MetingenRepository(self::$pdo);
    }

    public function testGetBadId(): void
    {
        self::assertGreaterThan(0, $this->repo()->getBadId('Diep'));
    }

    public function testGetBadIdOnbekendGeeft400(): void
    {
        $this->expectException(AppError::class);
        $this->expectExceptionCode(400);
        $this->repo()->getBadId('Bestaat niet');
    }

    public function testSaveGrootBadEnGetMetingen(): void
    {
        $repo = $this->repo();
        $badId = $repo->getBadId('Diep');

        $meta = $repo->saveGrootBadMeting($badId, [
            'datum' => self::D1, 'ph_waarde' => 7.1, 'flow' => 300, 'filter_druk_in' => 0.5,
        ], 'tester', null);
        self::assertSame(1, $meta['versie']);

        $rows = $this->repo()->getMetingen(self::D1);
        $diep = $this->vindBad($rows, 'Diep');
        self::assertNotNull($diep);
        self::assertSame(7.1, (float) $diep['ph_waarde']);
        self::assertSame(300, (int) $diep['flow']);
        self::assertSame('tester', $diep['auteur']);
    }

    public function testSavePeuterbad(): void
    {
        $repo = $this->repo();
        $badId = $repo->getBadId('Peuterbad');

        $repo->savePeuterbadMeting($badId, [
            'datum' => self::D1, 'ph_waarde' => 7.0, 'water' => 12, 'chemicalien_chloor' => 5,
        ], 'tester', null);

        $diep = $this->vindBad($this->repo()->getMetingen(self::D1), 'Peuterbad');
        self::assertNotNull($diep);
        self::assertSame(7.0, (float) $diep['ph_waarde']);
        self::assertSame(5, (int) $diep['chemicalien_chloor']);
    }

    /** @param array<int,array<string,mixed>> $rows */
    private function vindBad(array $rows, string $naam): ?array
    {
        foreach ($rows as $r) {
            if ($r['bad_naam'] === $naam) {
                return $r;
            }
        }

        return null;
    }
}
