<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IDienstService;
use Zwembad\Tests\Support\AppTestCase;

final class DienstControllerTest extends AppTestCase
{
    public function testGetDienstVoorElkeIngelogdeGebruiker(): void
    {
        $svc = $this->createMock(IDienstService::class);
        $svc->method('getDienst')->willReturn(['dienst_1' => 'Paul', 'dienst_2' => null]);
        $this->override(IDienstService::class, $svc);

        self::assertSame(401, $this->dispatch('GET', '/api/dienst')->getStatusCode());

        $res = $this->dispatch('GET', '/api/dienst', ['gebruiker' => $this->gebruiker(['coordinator' => 'lezen'])]);
        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['dienst_1' => 'Paul', 'dienst_2' => null], $this->json($res));
    }

    public function testGetWaterbeheerders(): void
    {
        $svc = $this->createMock(IDienstService::class);
        $svc->method('getWaterbeheerders')->willReturn(['Paul Heijmans', 'Jan Bakker']);
        $this->override(IDienstService::class, $svc);

        $res = $this->dispatch('GET', '/api/dienst/waterbeheerders', ['gebruiker' => $this->gebruiker(['waterbeheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['Paul Heijmans', 'Jan Bakker'], $this->json($res));
    }

    public function testSaveVereistWaterbeheerSchrijven(): void
    {
        $svc = $this->createMock(IDienstService::class);
        $this->override(IDienstService::class, $svc);

        $res = $this->dispatch('POST', '/api/dienst', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2020-01-01', 'dienst_1' => 'Paul'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }
}
