<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Repositories\ActieTekstenRepository;
use Zwembad\Repositories\ActiesRepository;

/**
 * Test de actiegeneratie-engine tegen echte data: drempelvergelijking, upsert/delete
 * van acties en resolve/unresolve.
 */
final class ActiesRepositoryTest extends IntegrationTestCase
{
    private function repo(): ActiesRepository
    {
        return new ActiesRepository(self::$pdo, new ActieTekstenRepository(self::$pdo));
    }

    public function testGenereerMaaktEnVerwijdertActie(): void
    {
        $repo = $this->repo();
        $badId = $this->badId('Diep');

        // Drukverschil 1.0 > drempel 0.4 → filter_spoelen_druk-actie aangemaakt.
        $repo->genereer($badId, self::D1, 'Diep', ['filter_druk_in' => 2.0, 'filter_druk_uit' => 1.0, 'flow' => 300]);
        $actie = $this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep');
        self::assertNotNull($actie);
        self::assertSame(0, $actie['opgelost']);
        self::assertNotSame('', $actie['beschrijving']);

        // Drukverschil 0.1 < 0.4 → de (nog open) actie wordt verwijderd.
        $repo->genereer($badId, self::D1, 'Diep', ['filter_druk_in' => 1.0, 'filter_druk_uit' => 0.9, 'flow' => 300]);
        self::assertNull($this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep'));
    }

    public function testResolveEnUnresolve(): void
    {
        $repo = $this->repo();
        $badId = $this->badId('Diep');
        $repo->genereer($badId, self::D1, 'Diep', ['filter_druk_in' => 2.0, 'filter_druk_uit' => 1.0]);
        $actie = $this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep');
        self::assertNotNull($actie);

        $repo->resolve((string) $actie['id'], 'tester');
        $opgelost = $this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep');
        self::assertSame(1, $opgelost['opgelost']);
        self::assertSame('tester', $opgelost['opgelost_door']);

        // Een opgeloste actie wordt NIET verwijderd door een herberekening (blijft staan).
        $repo->genereer($badId, self::D1, 'Diep', ['filter_druk_in' => 1.0, 'filter_druk_uit' => 0.9]);
        self::assertNotNull($this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep'));

        $repo->unresolve((string) $actie['id']);
        self::assertSame(0, $this->vindActie($repo->getActies(self::D1), 'filter_spoelen_druk', 'Diep')['opgelost']);
    }

    /** @param array<int,array<string,mixed>> $acties */
    private function vindActie(array $acties, string $type, string $badNaam): ?array
    {
        foreach ($acties as $a) {
            if ($a['actie_type'] === $type && $a['bad_naam'] === $badNaam) {
                return $a;
            }
        }

        return null;
    }
}
