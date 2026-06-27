<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use Zwembad\Repositories\IGebruikersRepository;
use Zwembad\Services\AuthService;

/**
 * Test de weergavenaam-tiebreak in AuthService met een gemockte gebruikers-repository.
 */
final class AuthServiceTest extends TestCase
{
    private function gebruiker(int $id, string $voornaam, string $achternaam): array
    {
        return [
            'id' => $id, 'gebruikersnaam' => 'g' . $id, 'voornaam' => $voornaam,
            'achternaam' => $achternaam, 'inlognaam' => 'g' . $id, 'rechten' => [],
            'magHistorie' => false, 'rolNamen' => [],
        ];
    }

    /** @param array<int,array<string,mixed>> $alle */
    private function maakService(array $ingelogd, array $alle): AuthService
    {
        $repo = $this->createMock(IGebruikersRepository::class);
        $repo->method('findByLogin')->willReturn($ingelogd);
        $repo->method('getAll')->willReturn($alle);

        return new AuthService($repo);
    }

    public function testLoginNullBijVerkeerdeGegevens(): void
    {
        $repo = $this->createMock(IGebruikersRepository::class);
        $repo->method('findByLogin')->willReturn(null);

        self::assertNull((new AuthService($repo))->login('x', 'y'));
    }

    public function testWeergavenaamUniekeVoornaam(): void
    {
        $paul = $this->gebruiker(1, 'Paul', 'Heijmans');
        $res = $this->maakService($paul, [$paul, $this->gebruiker(2, 'Jan', 'Bakker')])->login('pheijmans', 'x');

        self::assertSame('Paul', $res['weergavenaam']);
    }

    public function testWeergavenaamDubbeleVoornaamKrijgtInitiaal(): void
    {
        $paul = $this->gebruiker(1, 'Paul', 'Heijmans');
        $res = $this->maakService($paul, [$paul, $this->gebruiker(2, 'Paul', 'Bakker')])->login('x', 'y');

        self::assertSame('Paul H', $res['weergavenaam']);
    }

    public function testWeergavenaamBotsendeInitiaalKrijgtVolledigeAchternaam(): void
    {
        $paul = $this->gebruiker(1, 'Paul', 'Heijmans');
        $res = $this->maakService($paul, [$paul, $this->gebruiker(2, 'Paul', 'Hermans')])->login('x', 'y');

        self::assertSame('Paul Heijmans', $res['weergavenaam']);
    }
}
