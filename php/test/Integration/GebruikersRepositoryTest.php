<?php

declare(strict_types=1);

namespace Zwembad\Tests\Integration;

use Zwembad\Repositories\GebruikersRepository;
use Zwembad\Repositories\RollenRepository;

/**
 * Test de JOIN-zware logica: effectieve rechten uit rollen, rol_ids-stitching en
 * getMetRecht — tegen een echte DB.
 */
final class GebruikersRepositoryTest extends IntegrationTestCase
{
    private function maakRolMetRechten(array $rechten, bool $magHistorie = false): int
    {
        $rollen = new RollenRepository(self::$pdo);
        $rollen->create('ITest Rol');
        $id = (int) self::$pdo->query("SELECT id FROM rollen WHERE naam = 'ITest Rol'")->fetchColumn();
        $rollen->update((string) $id, ['naam' => 'ITest Rol', 'mag_historie_bewerken' => $magHistorie, 'rechten' => $rechten]);

        return $id;
    }

    public function testCreateFindByLoginGeeftEffectieveRechten(): void
    {
        $rolId = $this->maakRolMetRechten(['beheer' => 'schrijven', 'waterbeheer' => 'lezen'], magHistorie: true);
        $repo = new GebruikersRepository(self::$pdo);
        $repo->create([
            'voornaam' => 'Inte', 'achternaam' => 'Gratie', 'inlognaam' => 'itest_admin',
            'wachtwoord' => 'pw123', 'rol_ids' => [$rolId],
        ]);

        $u = $repo->findByLogin('itest_admin', 'pw123');

        self::assertNotNull($u);
        self::assertSame('schrijven', $u['rechten']['beheer']);
        self::assertSame('lezen', $u['rechten']['waterbeheer']);
        self::assertTrue($u['magHistorie']);
        self::assertContains('ITest Rol', $u['rolNamen']);
        self::assertSame('Inte Gratie', trim($u['voornaam'] . ' ' . $u['achternaam']));
    }

    public function testFindByLoginVerkeerdWachtwoord(): void
    {
        $rolId = $this->maakRolMetRechten(['beheer' => 'lezen']);
        $repo = new GebruikersRepository(self::$pdo);
        $repo->create(['voornaam' => 'A', 'achternaam' => 'B', 'inlognaam' => 'itest_x', 'wachtwoord' => 'goed', 'rol_ids' => [$rolId]]);

        self::assertNull($repo->findByLogin('itest_x', 'fout'));
    }

    public function testGetAllBevatRolIdsEnGetMetRecht(): void
    {
        $rolId = $this->maakRolMetRechten(['waterbeheer' => 'schrijven']);
        $repo = new GebruikersRepository(self::$pdo);
        $repo->create(['voornaam' => 'Wim', 'achternaam' => 'Beheer', 'inlognaam' => 'itest_wb', 'wachtwoord' => 'x', 'rol_ids' => [$rolId]]);

        $alle = array_values(array_filter($repo->getAll(), static fn ($g) => $g['inlognaam'] === 'itest_wb'));
        self::assertCount(1, $alle);
        self::assertContains($rolId, $alle[0]['rol_ids']);

        $metRecht = $repo->getMetRecht('waterbeheer', 'schrijven');
        $inlognamen = array_column($metRecht, 'inlognaam');
        self::assertContains('itest_wb', $inlognamen);
    }

    public function testUpdateEnRemove(): void
    {
        $rolId = $this->maakRolMetRechten(['beheer' => 'lezen']);
        $repo = new GebruikersRepository(self::$pdo);
        $repo->create(['voornaam' => 'Oud', 'achternaam' => 'Naam', 'inlognaam' => 'itest_u', 'wachtwoord' => 'x', 'rol_ids' => [$rolId]]);
        $id = (string) self::$pdo->query("SELECT id FROM gebruikers WHERE inlognaam = 'itest_u'")->fetchColumn();

        // Leeg wachtwoord = ongewijzigd laten; voornaam wijzigen.
        $repo->update($id, ['voornaam' => 'Nieuw', 'achternaam' => 'Naam', 'inlognaam' => 'itest_u', 'wachtwoord' => '', 'rol_ids' => [$rolId]]);
        self::assertNotNull($repo->findByLogin('itest_u', 'x')); // wachtwoord nog geldig
        $naam = self::$pdo->query("SELECT voornaam FROM gebruikers WHERE inlognaam = 'itest_u'")->fetchColumn();
        self::assertSame('Nieuw', $naam);

        $repo->remove($id);
        self::assertFalse(self::$pdo->query("SELECT 1 FROM gebruikers WHERE inlognaam = 'itest_u'")->fetchColumn());
    }
}
