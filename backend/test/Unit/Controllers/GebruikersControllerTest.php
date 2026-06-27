<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IGebruikersService;
use Zwembad\Tests\Support\AppTestCase;

final class GebruikersControllerTest extends AppTestCase
{
    public function testGetAllVereistBeheerLezen(): void
    {
        $this->override(IGebruikersService::class, $this->createMock(IGebruikersService::class));

        self::assertSame(401, $this->dispatch('GET', '/api/gebruikers')->getStatusCode());
        self::assertSame(403, $this->dispatch('GET', '/api/gebruikers', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
        ])->getStatusCode());
    }

    public function testGetAll(): void
    {
        $svc = $this->createMock(IGebruikersService::class);
        $svc->method('getAll')->willReturn([['id' => 1, 'inlognaam' => 'Admin', 'rol_ids' => [1]]]);
        $this->override(IGebruikersService::class, $svc);

        $res = $this->dispatch('GET', '/api/gebruikers', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame([['id' => 1, 'inlognaam' => 'Admin', 'rol_ids' => [1]]], $this->json($res));
    }

    public function testCreate(): void
    {
        $svc = $this->createMock(IGebruikersService::class);
        $svc->expects(self::once())->method('create');
        $this->override(IGebruikersService::class, $svc);

        $res = $this->dispatch('POST', '/api/gebruikers', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['voornaam' => 'A', 'achternaam' => 'B', 'inlognaam' => 'ab', 'wachtwoord' => 'x', 'rol_ids' => [1]],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testCreateValidatie400(): void
    {
        $svc = $this->createMock(IGebruikersService::class);
        $svc->expects(self::never())->method('create');
        $this->override(IGebruikersService::class, $svc);

        $res = $this->dispatch('POST', '/api/gebruikers', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['inlognaam' => '', 'wachtwoord' => '', 'rol_ids' => []],
        ]);

        self::assertSame(400, $res->getStatusCode());
    }

    public function testRemove(): void
    {
        $svc = $this->createMock(IGebruikersService::class);
        $svc->expects(self::once())->method('remove')->with('7');
        $this->override(IGebruikersService::class, $svc);

        $res = $this->dispatch('DELETE', '/api/gebruikers/7', ['gebruiker' => $this->gebruiker(['beheer' => 'schrijven'])]);

        self::assertSame(200, $res->getStatusCode());
    }
}
