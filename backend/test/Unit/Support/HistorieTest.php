<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Support;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use PHPUnit\Framework\TestCase;
use Zwembad\Support\Historie;

final class HistorieTest extends TestCase
{
    private function vandaag(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('Europe/Amsterdam')))->format('Y-m-d');
    }

    private function relatief(int $dagen): string
    {
        $d = new DateTimeImmutable('now', new DateTimeZone('Europe/Amsterdam'));
        $interval = new DateInterval('P' . abs($dagen) . 'D');

        return ($dagen < 0 ? $d->sub($interval) : $d->add($interval))->format('Y-m-d');
    }

    public function testVandaagEnToekomstMagAltijd(): void
    {
        self::assertTrue(Historie::magDatumBewerken($this->vandaag(), null));
        self::assertTrue(Historie::magDatumBewerken($this->relatief(1), null));
        self::assertTrue(Historie::magDatumBewerken($this->relatief(5), ['magHistorie' => false]));
    }

    public function testVerledenVereistHistorieRecht(): void
    {
        $gisteren = $this->relatief(-1);

        self::assertFalse(Historie::magDatumBewerken($gisteren, null));
        self::assertFalse(Historie::magDatumBewerken($gisteren, ['magHistorie' => false]));
        self::assertTrue(Historie::magDatumBewerken($gisteren, ['magHistorie' => true]));
    }

    public function testMagHistorie(): void
    {
        self::assertTrue(Historie::magHistorie(['magHistorie' => true]));
        self::assertFalse(Historie::magHistorie(['magHistorie' => false]));
        self::assertFalse(Historie::magHistorie([]));
        self::assertFalse(Historie::magHistorie(null));
    }

    public function testVandaagAmsterdamHeeftIsoFormaat(): void
    {
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', Historie::vandaagAmsterdam());
    }
}
