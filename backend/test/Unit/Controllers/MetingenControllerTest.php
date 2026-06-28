<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IMetingenService;
use Zwembad\Tests\Support\AppTestCase;

final class MetingenControllerTest extends AppTestCase
{
    public function testGetMetingenVereistWaterbeheerLezen(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $this->override(IMetingenService::class, $svc);

        self::assertSame(401, $this->dispatch('GET', '/api/metingen')->getStatusCode());
        self::assertSame(403, $this->dispatch('GET', '/api/metingen', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
        ])->getStatusCode());
    }

    public function testGetMetingen(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $svc->method('getMetingen')->with('2026-06-26')->willReturn([['bad_naam' => 'Diep']]);
        $this->override(IMetingenService::class, $svc);

        $res = $this->dispatch('GET', '/api/metingen', [
            'query' => ['datum' => '2026-06-26'],
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'lezen']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame([['bad_naam' => 'Diep']], $this->json($res));
    }

    public function testPostMetingSuccesGeeftMetaTerug(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $svc->expects(self::once())->method('saveMeting')
            ->willReturn(['versie' => 2, 'auteur' => 'Test User', 'bijgewerkt_op' => '2026-06-26T10:00:00']);
        $this->override(IMetingenService::class, $svc);

        $res = $this->dispatch('POST', '/api/metingen', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2999-01-01', 'bad_naam' => 'Diep', 'ph_waarde' => 7.1],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(
            ['status' => 'success', 'versie' => 2, 'auteur' => 'Test User', 'bijgewerkt_op' => '2026-06-26T10:00:00'],
            $this->json($res),
        );
    }

    public function testPostMetingHistorie403VoorDatumInVerleden(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $svc->expects(self::never())->method('saveMeting');
        $this->override(IMetingenService::class, $svc);

        $res = $this->dispatch('POST', '/api/metingen', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven'], magHistorie: false),
            'body' => ['datum' => '2000-01-01', 'bad_naam' => 'Diep'],
        ]);

        self::assertSame(403, $res->getStatusCode());
        self::assertStringContainsString('verleden', $this->json($res)['error']);
    }

    public function testPostMetingValidatie400(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $svc->expects(self::never())->method('saveMeting');
        $this->override(IMetingenService::class, $svc);

        $res = $this->dispatch('POST', '/api/metingen', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['datum' => '2999-01-01'], // bad_naam ontbreekt
        ]);

        self::assertSame(400, $res->getStatusCode());
    }

    public function testResolveActie(): void
    {
        $svc = $this->createMock(IMetingenService::class);
        $svc->expects(self::once())->method('resolveActie')->with('5', self::isType('array'));
        $this->override(IMetingenService::class, $svc);

        $res = $this->dispatch('POST', '/api/acties/5/resolve', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }
}
