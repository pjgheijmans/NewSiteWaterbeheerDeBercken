<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IVerbruikService;
use Zwembad\Tests\Support\AppTestCase;

final class VerbruikControllerTest extends AppTestCase
{
    public function testGetVerbruik(): void
    {
        $svc = $this->createMock(IVerbruikService::class);
        $svc->method('getVerbruik')->with('2026-06-26')->willReturn(['water_diep' => 100, 'versie' => 1]);
        $this->override(IVerbruikService::class, $svc);

        $res = $this->dispatch('GET', '/api/verbruik/diep-ondiep', [
            'query' => ['datum' => '2026-06-26'],
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'lezen']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['water_diep' => 100, 'versie' => 1], $this->json($res));
    }

    public function testPostVerbruikSuccesMetMeta(): void
    {
        $svc = $this->createMock(IVerbruikService::class);
        $svc->expects(self::once())->method('saveVerbruik')
            ->willReturn(['versie' => 1, 'auteur' => 'Test User', 'bijgewerkt_op' => '2026-06-26T10:00:00']);
        $this->override(IVerbruikService::class, $svc);

        $res = $this->dispatch('POST', '/api/verbruik/diep-ondiep', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2999-01-01', 'water_diep' => 100],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
        self::assertSame(1, $this->json($res)['versie']);
    }
}
