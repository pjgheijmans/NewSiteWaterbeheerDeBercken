<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Errors\AppError;
use Zwembad\Services\IConfiguratieService;
use Zwembad\Tests\Support\AppTestCase;

final class ConfiguratieControllerTest extends AppTestCase
{
    public function testGetAll(): void
    {
        $svc = $this->createMock(IConfiguratieService::class);
        $svc->method('getAll')->willReturn([['sleutel' => 'sessie_timeout_minuten', 'waarde' => '5', 'omschrijving' => null, 'type' => 'getal']]);
        $this->override(IConfiguratieService::class, $svc);

        $res = $this->dispatch('GET', '/api/configuratie', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('sessie_timeout_minuten', $this->json($res)[0]['sleutel']);
    }

    public function testUpdate(): void
    {
        $svc = $this->createMock(IConfiguratieService::class);
        $svc->expects(self::once())->method('update')->with('sessie_timeout_minuten', '15');
        $this->override(IConfiguratieService::class, $svc);

        $res = $this->dispatch('PUT', '/api/configuratie/sessie_timeout_minuten', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['waarde' => '15'],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testUpdateOnbekendeSleutelGeeft404Door(): void
    {
        $svc = $this->createMock(IConfiguratieService::class);
        $svc->method('update')->willThrowException(new AppError('Onbekende configuratiesleutel: x', 404));
        $this->override(IConfiguratieService::class, $svc);

        $res = $this->dispatch('PUT', '/api/configuratie/x', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['waarde' => '1'],
        ]);

        self::assertSame(404, $res->getStatusCode());
        self::assertStringContainsString('Onbekende configuratiesleutel', $this->json($res)['error']);
    }
}
