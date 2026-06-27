<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IActieTekstenService;
use Zwembad\Tests\Support\AppTestCase;

final class ActieTekstenControllerTest extends AppTestCase
{
    public function testGetAll(): void
    {
        $svc = $this->createMock(IActieTekstenService::class);
        $svc->method('getAll')->willReturn([['actie_sleutel' => 'chloor_bestellen', 'sjabloon' => 'S', 'omschrijving' => null]]);
        $this->override(IActieTekstenService::class, $svc);

        $res = $this->dispatch('GET', '/api/actieteksten', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('chloor_bestellen', $this->json($res)[0]['actie_sleutel']);
    }

    public function testSave(): void
    {
        $svc = $this->createMock(IActieTekstenService::class);
        $svc->expects(self::once())->method('save')->with(['actie_sleutel' => 'chloor_bestellen', 'sjabloon' => 'Nieuw sjabloon']);
        $this->override(IActieTekstenService::class, $svc);

        $res = $this->dispatch('POST', '/api/actieteksten', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['actie_sleutel' => 'chloor_bestellen', 'sjabloon' => 'Nieuw sjabloon'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testSaveValidatie400(): void
    {
        $svc = $this->createMock(IActieTekstenService::class);
        $svc->expects(self::never())->method('save');
        $this->override(IActieTekstenService::class, $svc);

        $res = $this->dispatch('POST', '/api/actieteksten', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['actie_sleutel' => '', 'sjabloon' => ''],
        ]);

        self::assertSame(400, $res->getStatusCode());
    }
}
