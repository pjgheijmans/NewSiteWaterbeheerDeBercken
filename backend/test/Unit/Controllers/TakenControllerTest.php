<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\ITakenService;
use Zwembad\Tests\Support\AppTestCase;

final class TakenControllerTest extends AppTestCase
{
    public function testGetTaken(): void
    {
        $svc = $this->createMock(ITakenService::class);
        $svc->method('getTaken')->with('2026-06-26')->willReturn([['sleutel' => 'diep_filter', 'categorie' => 'overig']]);
        $this->override(ITakenService::class, $svc);

        $res = $this->dispatch('GET', '/api/taken', [
            'query' => ['datum' => '2026-06-26'],
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'lezen']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame([['sleutel' => 'diep_filter', 'categorie' => 'overig']], $this->json($res));
    }
}
