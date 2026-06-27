<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Repositories\RollenRepository;

final class RollenRepositoryTest extends IntegrationTestCase
{
    private function repo(): RollenRepository
    {
        return new RollenRepository(self::$pdo);
    }

    public function testCreateGeeftCompleteMatrix(): void
    {
        $repo = $this->repo();
        $repo->create('ITest Rol');

        $rol = $this->vind($repo->getAll(), 'ITest Rol');
        self::assertNotNull($rol);
        self::assertFalse($rol['mag_historie_bewerken']);
        self::assertSame(['beheer' => 'geen', 'waterbeheer' => 'geen', 'coordinator' => 'geen'], $rol['rechten']);
    }

    public function testUpdateZetNaamHistorieEnRechten(): void
    {
        $repo = $this->repo();
        $repo->create('ITest Rol');
        $id = (string) self::$pdo->query("SELECT id FROM rollen WHERE naam = 'ITest Rol'")->fetchColumn();

        $repo->update($id, [
            'naam' => 'ITest Rol B', 'mag_historie_bewerken' => true,
            'rechten' => ['waterbeheer' => 'schrijven', 'beheer' => 'lezen'],
        ]);

        $rol = $this->vind($repo->getAll(), 'ITest Rol B');
        self::assertNotNull($rol);
        self::assertTrue($rol['mag_historie_bewerken']);
        self::assertSame('schrijven', $rol['rechten']['waterbeheer']);
        self::assertSame('lezen', $rol['rechten']['beheer']);
        self::assertSame('geen', $rol['rechten']['coordinator']);
    }

    public function testRemove(): void
    {
        $repo = $this->repo();
        $repo->create('ITest Rol');
        $id = (string) self::$pdo->query("SELECT id FROM rollen WHERE naam = 'ITest Rol'")->fetchColumn();

        $repo->remove($id);

        self::assertNull($this->vind($repo->getAll(), 'ITest Rol'));
    }

    /** @param array<int,array<string,mixed>> $rollen */
    private function vind(array $rollen, string $naam): ?array
    {
        foreach ($rollen as $r) {
            if ($r['naam'] === $naam) {
                return $r;
            }
        }

        return null;
    }
}
