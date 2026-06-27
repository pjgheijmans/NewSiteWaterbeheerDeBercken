<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\ITrendService;
use Zwembad\Tests\Support\AppTestCase;

final class TrendControllerTest extends AppTestCase
{
    public function testGetMetingenTrend(): void
    {
        $svc = $this->createMock(ITrendService::class);
        $svc->method('getMetingenTrend')->with('2026-01-01', '2026-12-31')->willReturn([['datum' => '2026-06-26', 'bad_naam' => 'Diep']]);
        $this->override(ITrendService::class, $svc);

        $res = $this->dispatch('GET', '/api/trend/metingen', [
            'query' => ['van' => '2026-01-01', 'tot' => '2026-12-31'],
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'lezen']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame([['datum' => '2026-06-26', 'bad_naam' => 'Diep']], $this->json($res));
    }

    public function testTrendVereistWaterbeheerLezen(): void
    {
        $this->override(ITrendService::class, $this->createMock(ITrendService::class));

        self::assertSame(401, $this->dispatch('GET', '/api/trend/metingen')->getStatusCode());
        self::assertSame(403, $this->dispatch('GET', '/api/trend/metingen', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
        ])->getStatusCode());
    }
}
