<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\ILogboekService;
use Zwembad\Tests\Support\AppTestCase;

final class LogboekControllerTest extends AppTestCase
{
    public function testSaveGeeftIdEnAuteurTerug(): void
    {
        $svc = $this->createMock(ILogboekService::class);
        $svc->expects(self::once())->method('save')->willReturn(['id' => 9, 'auteur' => 'Test User']);
        $this->override(ILogboekService::class, $svc);

        $res = $this->dispatch('POST', '/api/logboek', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2999-01-01', 'tijdstip' => '2999-01-01 09:00:00', 'tekst' => 'ronde gedaan'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['status' => 'success', 'id' => 9, 'auteur' => 'Test User'], $this->json($res));
    }

    public function testSaveHistorie403(): void
    {
        $svc = $this->createMock(ILogboekService::class);
        $svc->expects(self::never())->method('save');
        $this->override(ILogboekService::class, $svc);

        $res = $this->dispatch('POST', '/api/logboek', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven'], magHistorie: false),
            'body' => ['datum' => '2000-01-01', 'tijdstip' => 't', 'tekst' => 'x'],
        ]);

        self::assertSame(403, $res->getStatusCode());
    }
}
