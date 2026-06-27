<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\ICoordinatorenService;
use Zwembad\Tests\Support\AppTestCase;

final class CoordinatorenControllerTest extends AppTestCase
{
    public function testDeleteBlokVereistDatumEnTijdstip(): void
    {
        $svc = $this->createMock(ICoordinatorenService::class);
        $svc->expects(self::never())->method('deleteBlok');
        $this->override(ICoordinatorenService::class, $svc);

        $res = $this->dispatch('DELETE', '/api/coordinatoren', ['gebruiker' => $this->gebruiker(['coordinator' => 'schrijven'])]);

        self::assertSame(400, $res->getStatusCode());
        self::assertSame('datum en tijdstip zijn verplicht', $this->json($res)['error']);
    }

    public function testPostLogboekGeeftIdEnAuteurTerug(): void
    {
        $svc = $this->createMock(ICoordinatorenService::class);
        $svc->expects(self::once())->method('saveLogboek')->willReturn(['id' => 4, 'auteur' => 'Test User']);
        $this->override(ICoordinatorenService::class, $svc);

        $res = $this->dispatch('POST', '/api/coordinatoren/logboek', [
            'gebruiker' => $this->gebruiker(['coordinator' => 'schrijven']),
            'body' => ['datum' => '2999-01-01', 'tijdstip' => '2999-01-01 10:00:00', 'tekst' => 'controle ok'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['status' => 'success', 'id' => 4, 'auteur' => 'Test User'], $this->json($res));
    }

    public function testPostMetingVereistCoordinatorSchrijven(): void
    {
        $svc = $this->createMock(ICoordinatorenService::class);
        $svc->expects(self::never())->method('saveMeting');
        $this->override(ICoordinatorenService::class, $svc);

        $res = $this->dispatch('POST', '/api/coordinatoren', [
            'gebruiker' => $this->gebruiker(['coordinator' => 'lezen']),
            'body' => ['datum' => '2999-01-01', 'bad_naam' => 'Diep'],
        ]);

        self::assertSame(403, $res->getStatusCode());
    }
}
