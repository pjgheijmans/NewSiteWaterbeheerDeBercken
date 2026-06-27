<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Repositories\LimietenRepository;

final class LimietenRepositoryTest extends IntegrationTestCase
{
    private function repo(): LimietenRepository
    {
        return new LimietenRepository(self::$pdo);
    }

    public function testSaveEnGetAllAlsFloatMap(): void
    {
        $repo = $this->repo();
        $repo->save(['parameter_naam' => 'itest_param', 'min_waarde' => 1.5, 'max_waarde' => 9.5]);

        $all = $repo->getAll();
        self::assertArrayHasKey('itest_param', $all);
        self::assertSame(1.5, $all['itest_param']['min']);
        self::assertSame(9.5, $all['itest_param']['max']);
    }

    public function testSaveIsUpsert(): void
    {
        $repo = $this->repo();
        $repo->save(['parameter_naam' => 'itest_param', 'min_waarde' => 1.0, 'max_waarde' => 2.0]);
        $repo->save(['parameter_naam' => 'itest_param', 'min_waarde' => 3.0, 'max_waarde' => 4.0]);

        $all = $repo->getAll();
        self::assertSame(3.0, $all['itest_param']['min']);
        self::assertSame(4.0, $all['itest_param']['max']);
    }

    public function testGetDefaultsEnSeedDefaults(): void
    {
        $repo = $this->repo();
        self::assertArrayHasKey('ph_waarde', $repo->getDefaults());

        $repo->seedDefaults(); // idempotent
        self::assertArrayHasKey('ph_waarde', $repo->getAll());
    }
}
