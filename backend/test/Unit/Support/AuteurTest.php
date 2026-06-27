<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Support;

use PHPUnit\Framework\TestCase;
use Zwembad\Support\Auteur;

final class AuteurTest extends TestCase
{
    public function testVolledigeNaam(): void
    {
        self::assertSame('Paul Heijmans', Auteur::bepaal([
            'voornaam' => 'Paul',
            'achternaam' => 'Heijmans',
            'inlognaam' => 'pheijmans',
            'gebruikersnaam' => 'pheijmans',
        ]));
    }

    public function testAlleenVoornaam(): void
    {
        self::assertSame('Paul', Auteur::bepaal(['voornaam' => 'Paul', 'achternaam' => '']));
    }

    public function testValtTerugOpInlognaam(): void
    {
        self::assertSame('admin', Auteur::bepaal([
            'voornaam' => '',
            'achternaam' => '',
            'inlognaam' => 'admin',
            'gebruikersnaam' => 'g',
        ]));
    }

    public function testValtTerugOpGebruikersnaam(): void
    {
        self::assertSame('g', Auteur::bepaal([
            'voornaam' => '',
            'achternaam' => '',
            'inlognaam' => '',
            'gebruikersnaam' => 'g',
        ]));
    }
}
