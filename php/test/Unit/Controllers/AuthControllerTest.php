<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IAuthService;
use Zwembad\Tests\Support\AppTestCase;

final class AuthControllerTest extends AppTestCase
{
    public function testLoginSuccesZetSessie(): void
    {
        $gebruiker = ['id' => 1, 'gebruikersnaam' => 'Admin', 'weergavenaam' => 'Admin', 'rechten' => ['beheer' => 'schrijven']];
        $svc = $this->createMock(IAuthService::class);
        $svc->method('login')->with('Admin', 'lpphw')->willReturn($gebruiker);
        $this->override(IAuthService::class, $svc);

        $res = $this->dispatch('POST', '/api/login', ['body' => ['username' => 'Admin', 'password' => 'lpphw']]);

        self::assertSame(200, $res->getStatusCode());
        $body = $this->json($res);
        self::assertSame('success', $body['status']);
        self::assertSame('Admin', $body['gebruiker']['gebruikersnaam']);
        self::assertSame($gebruiker, $_SESSION['gebruiker']);
    }

    public function testLoginVerkeerdeGegevens401(): void
    {
        $svc = $this->createMock(IAuthService::class);
        $svc->method('login')->willReturn(null);
        $this->override(IAuthService::class, $svc);

        $res = $this->dispatch('POST', '/api/login', ['body' => ['username' => 'x', 'password' => 'y']]);

        self::assertSame(401, $res->getStatusCode());
        self::assertSame('Onjuiste inlognaam of wachtwoord', $this->json($res)['error']);
    }

    public function testLoginValidatie400(): void
    {
        $svc = $this->createMock(IAuthService::class);
        $svc->expects(self::never())->method('login');
        $this->override(IAuthService::class, $svc);

        $res = $this->dispatch('POST', '/api/login', ['body' => []]);

        self::assertSame(400, $res->getStatusCode());
    }

    public function testIngelogdFalseEnTrue(): void
    {
        $res = $this->dispatch('GET', '/api/ingelogd');
        self::assertSame(['ingelogd' => false], $this->json($res));

        $res = $this->dispatch('GET', '/api/ingelogd', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);
        $body = $this->json($res);
        self::assertTrue($body['ingelogd']);
        self::assertSame('tester', $body['gebruiker']['gebruikersnaam']);
    }

    public function testLogout(): void
    {
        $res = $this->dispatch('POST', '/api/logout');

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }
}
