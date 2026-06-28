<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Repositories\IRollenRepository;
use Zwembad\Tests\Support\AppTestCase;

final class RollenControllerTest extends AppTestCase
{
    public function testGetAll(): void
    {
        $repo = $this->createMock(IRollenRepository::class);
        $repo->method('getAll')->willReturn([['id' => 1, 'naam' => 'Beheer', 'mag_historie_bewerken' => true, 'rechten' => []]]);
        $this->override(IRollenRepository::class, $repo);

        $res = $this->dispatch('GET', '/api/rollen', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('Beheer', $this->json($res)[0]['naam']);
    }

    public function testCreate(): void
    {
        $repo = $this->createMock(IRollenRepository::class);
        $repo->expects(self::once())->method('create')->with('Nieuw');
        $this->override(IRollenRepository::class, $repo);

        $res = $this->dispatch('POST', '/api/rollen', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['naam' => 'Nieuw'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testUpdate(): void
    {
        $repo = $this->createMock(IRollenRepository::class);
        $repo->expects(self::once())->method('update')->with('3', self::isType('array'));
        $this->override(IRollenRepository::class, $repo);

        $res = $this->dispatch('PUT', '/api/rollen/3', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['naam' => 'X', 'mag_historie_bewerken' => false, 'rechten' => ['beheer' => 'lezen']],
        ]);

        self::assertSame(200, $res->getStatusCode());
    }

    public function testCreateVereistBeheerSchrijven(): void
    {
        $repo = $this->createMock(IRollenRepository::class);
        $repo->expects(self::never())->method('create');
        $this->override(IRollenRepository::class, $repo);

        $res = $this->dispatch('POST', '/api/rollen', [
            'gebruiker' => $this->gebruiker(['beheer' => 'lezen']),
            'body' => ['naam' => 'Nieuw'],
        ]);

        self::assertSame(403, $res->getStatusCode());
    }
}
