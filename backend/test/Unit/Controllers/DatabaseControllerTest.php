<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Controllers;

use Zwembad\Services\IDatabaseService;
use Zwembad\Tests\Support\AppTestCase;

final class DatabaseControllerTest extends AppTestCase
{
    public function testTruncateOngeldigeTabelnaam400(): void
    {
        $svc = $this->createMock(IDatabaseService::class);
        $svc->expects(self::never())->method('truncate');
        $this->override(IDatabaseService::class, $svc);

        $res = $this->dispatch('POST', '/api/database/truncate/robert_drop_tables', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
        ]);

        self::assertSame(400, $res->getStatusCode());
        self::assertSame('Ongeldige tabelnaam', $this->json($res)['error']);
    }

    public function testTruncateGeldigeTabel(): void
    {
        $svc = $this->createMock(IDatabaseService::class);
        $svc->expects(self::once())->method('truncate')->with('logboek');
        $this->override(IDatabaseService::class, $svc);

        $res = $this->dispatch('POST', '/api/database/truncate/logboek', [
            'gebruiker' => $this->gebruiker(['beheer' => 'schrijven']),
        ]);

        self::assertSame(200, $res->getStatusCode());
        self::assertSame('success', $this->json($res)['status']);
    }

    public function testExportLegeTabel404(): void
    {
        $svc = $this->createMock(IDatabaseService::class);
        $svc->method('exporteerCsv')->willReturn(null);
        $this->override(IDatabaseService::class, $svc);

        $res = $this->dispatch('GET', '/api/database/export/logboek', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(404, $res->getStatusCode());
    }

    public function testExportCsv(): void
    {
        $svc = $this->createMock(IDatabaseService::class);
        $svc->method('exporteerCsv')->willReturn("id;tekst\r\n1;hoi\r\n");
        $this->override(IDatabaseService::class, $svc);

        $res = $this->dispatch('GET', '/api/database/export/logboek', ['gebruiker' => $this->gebruiker(['beheer' => 'lezen'])]);

        self::assertSame(200, $res->getStatusCode());
        self::assertStringContainsString('text/csv', $res->getHeaderLine('Content-Type'));
        self::assertSame("id;tekst\r\n1;hoi\r\n", (string) $res->getBody());
    }
}
