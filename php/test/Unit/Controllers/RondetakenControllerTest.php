<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IRondetakenService;
use Zwembad\Tests\Support\AppTestCase;

final class RondetakenControllerTest extends AppTestCase
{
    public function testVoltooi(): void
    {
        $svc = $this->createMock(IRondetakenService::class);
        $svc->expects(self::once())->method('voltooi')->with('diep_filter', '2999-01-01', self::isType('array'));
        $this->override(IRondetakenService::class, $svc);

        $res = $this->dispatch('POST', '/api/rondetaken/diep_filter/voltooi', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2999-01-01'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testVoltooiHistorie403(): void
    {
        $svc = $this->createMock(IRondetakenService::class);
        $svc->expects(self::never())->method('voltooi');
        $this->override(IRondetakenService::class, $svc);

        $res = $this->dispatch('POST', '/api/rondetaken/diep_filter/voltooi', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven'], magHistorie: false),
            'body' => ['datum' => '2000-01-01'],
        ]);

        self::assertSame(403, $res->getStatusCode());
    }
}
