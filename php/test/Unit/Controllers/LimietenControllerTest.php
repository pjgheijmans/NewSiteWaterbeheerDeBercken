<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\ILimietenService;
use Zwembad\Tests\Support\AppTestCase;

final class LimietenControllerTest extends AppTestCase
{
    public function testGetVereistLogin(): void
    {
        $res = $this->dispatch('GET', '/api/limieten');

        self::assertSame(401, $res->getStatusCode());
        self::assertSame('Niet ingelogd', $this->json($res)['error']);
    }

    public function testGetLeesbaarVoorElkeIngelogdeGebruiker(): void
    {
        $svc = $this->createMock(ILimietenService::class);
        $svc->method('getAll')->willReturn(['ph_waarde' => ['min' => 6.8, 'max' => 7.6]]);
        $this->override(ILimietenService::class, $svc);

        // Een waterbeheer-gebruiker (zonder beheer-recht) mag de limieten LEZEN.
        $res = $this->dispatch('GET', '/api/limieten', ['gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['ph_waarde' => ['min' => 6.8, 'max' => 7.6]], $this->json($res));
    }

    public function testPostVereistBeheerSchrijven(): void
    {
        $svc = $this->createMock(ILimietenService::class);
        $svc->expects(self::never())->method('save');
        $this->override(ILimietenService::class, $svc);

        $res = $this->dispatch('POST', '/api/limieten', [
            'gebruiker' => $this->gebruiker(['waterbeheer' => 'schrijven']),
            'body' => ['parameter_naam' => 'ph_waarde', 'min_waarde' => 6.8, 'max_waarde' => 7.6],
        ]);

        self::assertSame(403, $res->getStatusCode());
    }

    public function testPostMetBeheerSlaatOp(): void
    {
        $svc = $this->createMock(ILimietenService::class);
        $svc->expects(self::once())->method('save')
            ->with(['parameter_naam' => 'ph_waarde', 'min_waarde' => 6.8, 'max_waarde' => 7.6]);
        $this->override(ILimietenService::class, $svc);

        $res = $this->dispatch('POST', '/api/limieten', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['parameter_naam' => 'ph_waarde', 'min_waarde' => 6.8, 'max_waarde' => 7.6],
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testPostOngeldigeInvoer400(): void
    {
        $svc = $this->createMock(ILimietenService::class);
        $svc->expects(self::never())->method('save');
        $this->override(ILimietenService::class, $svc);

        $res = $this->dispatch('POST', '/api/limieten', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
            'body' => ['parameter_naam' => ''],
        ]);

        self::assertSame(400, $res->getStatusCode());
        self::assertStringStartsWith('Ongeldige invoer', $this->json($res)['error']);
    }
}
