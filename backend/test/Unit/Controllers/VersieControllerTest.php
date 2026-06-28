<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Tests\Support\AppTestCase;

final class VersieControllerTest extends AppTestCase
{
    public function testVersieIsPubliek(): void
    {
        // Geen login: de versie staat in de kop nog vóór het inloggen.
        $res = $this->dispatch('GET', '/api/versie');

        self::assertSame(200, $res->getStatusCode());
        $body = $this->json($res);
        self::assertArrayHasKey('versie', $body);
        self::assertArrayHasKey('commit', $body);
    }
}
