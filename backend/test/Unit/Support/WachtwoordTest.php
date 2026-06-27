<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Support;

use PHPUnit\Framework\TestCase;
use Zwembad\Support\Wachtwoord;

final class WachtwoordTest extends TestCase
{
    public function testHashKanGeverifieerdWorden(): void
    {
        $hash = Wachtwoord::hash('geheim123');

        self::assertNotSame('geheim123', $hash);
        self::assertTrue(Wachtwoord::verifieer('geheim123', $hash));
        self::assertFalse(Wachtwoord::verifieer('verkeerd', $hash));
    }

    public function testIsGehashtHerkentEenHash(): void
    {
        self::assertTrue(Wachtwoord::isGehasht(Wachtwoord::hash('x')));
        self::assertFalse(Wachtwoord::isGehasht('platte-tekst'));
        self::assertFalse(Wachtwoord::isGehasht(null));
        self::assertFalse(Wachtwoord::isGehasht(''));
    }

    public function testVerifieerAccepteertLegacyPlaintext(): void
    {
        // Seed-accounts staan eerst als platte tekst (worden bij login gehasht).
        self::assertTrue(Wachtwoord::verifieer('lpphw', 'lpphw'));
        self::assertFalse(Wachtwoord::verifieer('fout', 'lpphw'));
    }

    public function testVerifieerMetLegeOpslagIsFalse(): void
    {
        self::assertFalse(Wachtwoord::verifieer('x', null));
        self::assertFalse(Wachtwoord::verifieer('x', ''));
    }
}
