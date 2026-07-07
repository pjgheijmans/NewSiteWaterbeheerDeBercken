<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Validation;

use PHPUnit\Framework\TestCase;
use Zwembad\Errors\AppError;
use Zwembad\Validation\Validator;

final class ValidatorTest extends TestCase
{
    /** Assert dat $fn een AppError met de gegeven status gooit; geeft de error terug. */
    private function assertOngeldig(callable $fn, int $status = 400): AppError
    {
        try {
            $fn();
        } catch (AppError $e) {
            self::assertSame($status, $e->getStatus());

            return $e;
        }
        self::fail('Verwachtte AppError(' . $status . ')');
    }

    // ── login ────────────────────────────────────────────────────────────────
    public function testLoginGeldig(): void
    {
        self::assertSame(
            ['username' => 'Admin', 'password' => 'lpphw'],
            Validator::login(['username' => 'Admin', 'password' => 'lpphw']),
        );
    }

    public function testLoginVerplichteVelden(): void
    {
        $e = $this->assertOngeldig(fn () => Validator::login([]));
        self::assertStringContainsString('username: is verplicht', $e->getMessage());
        self::assertStringContainsString('password: is verplicht', $e->getMessage());
    }

    // ── meting (looseObject: datum + bad_naam verplicht, rest loopt mee) ───────
    public function testMetingGeldigLaatExtraVeldenStaan(): void
    {
        $body = ['datum' => '2026-06-26', 'bad_naam' => 'Diep', 'ph_waarde' => 7.1, 'versie' => 3];
        self::assertSame($body, Validator::meting($body));
    }

    public function testMetingDatumformaat(): void
    {
        $this->assertOngeldig(fn () => Validator::meting(['datum' => '26-06-2026', 'bad_naam' => 'Diep']));
    }

    public function testMetingBadNaamVerplicht(): void
    {
        $this->assertOngeldig(fn () => Validator::meting(['datum' => '2026-06-26']));
    }

    public function testMetingDatumMagNietInToekomstLiggen(): void
    {
        $morgen = date('Y-m-d', strtotime('+1 day'));
        $e = $this->assertOngeldig(fn () => Validator::meting(['datum' => $morgen, 'bad_naam' => 'Diep']));
        self::assertStringContainsString('mag niet in de toekomst liggen', $e->getMessage());
    }

    public function testMetingDatumVandaagIsToegestaan(): void
    {
        $vandaag = date('Y-m-d');
        $body = ['datum' => $vandaag, 'bad_naam' => 'Diep'];
        self::assertSame($body, Validator::meting($body));
    }

    // ── logboek (incl. harde 500-tekens cap) ───────────────────────────────────
    public function testLogboekGeldig(): void
    {
        $r = Validator::logboek(['datum' => '2026-06-26', 'tijdstip' => '10:00', 'tekst' => 'hoi']);
        self::assertSame(['datum' => '2026-06-26', 'tijdstip' => '10:00', 'tekst' => 'hoi'], $r);
    }

    public function testLogboekTijdstipVerplicht(): void
    {
        $this->assertOngeldig(fn () => Validator::logboek(['datum' => '2026-06-26', 'tijdstip' => '']));
    }

    public function testLogboekTekstMaximaal500Tekens(): void
    {
        $ok = Validator::logboek(['datum' => '2026-06-26', 'tijdstip' => 't', 'tekst' => str_repeat('x', 500)]);
        self::assertSame(500, mb_strlen($ok['tekst']));

        $e = $this->assertOngeldig(
            fn () => Validator::logboek(['datum' => '2026-06-26', 'tijdstip' => 't', 'tekst' => str_repeat('x', 501)]),
        );
        self::assertStringContainsString('500 tekens', $e->getMessage());
    }

    // ── limiet ─────────────────────────────────────────────────────────────────
    public function testLimietGeldigNormaliseertGetallen(): void
    {
        $r = Validator::limiet(['parameter_naam' => 'ph_waarde', 'min_waarde' => '6,8', 'max_waarde' => 7.6]);
        self::assertSame(['parameter_naam' => 'ph_waarde', 'min_waarde' => 6.8, 'max_waarde' => 7.6], $r);
    }

    public function testLimietParameterEnGetalVerplicht(): void
    {
        $this->assertOngeldig(fn () => Validator::limiet(['parameter_naam' => '', 'min_waarde' => 'x', 'max_waarde' => 1]));
    }

    // ── rol ────────────────────────────────────────────────────────────────────
    public function testRolUpdateGeldig(): void
    {
        $r = Validator::rolUpdate([
            'naam' => 'Beheer',
            'mag_historie_bewerken' => true,
            'rechten' => ['beheer' => 'schrijven', 'waterbeheer' => 'geen'],
        ]);
        self::assertSame('Beheer', $r['naam']);
        self::assertTrue($r['mag_historie_bewerken']);
        self::assertSame('schrijven', $r['rechten']['beheer']);
    }

    public function testRolUpdateOngeldigNiveau(): void
    {
        $this->assertOngeldig(fn () => Validator::rolUpdate([
            'naam' => 'X',
            'mag_historie_bewerken' => false,
            'rechten' => ['beheer' => 'baas'],
        ]));
    }

    // ── gebruiker (create vs update) ───────────────────────────────────────────
    public function testGebruikerCreateEistWachtwoord(): void
    {
        $this->assertOngeldig(fn () => Validator::gebruiker(
            ['voornaam' => 'A', 'achternaam' => 'B', 'inlognaam' => 'ab', 'wachtwoord' => '', 'rol_ids' => []],
            true,
        ));
    }

    public function testGebruikerUpdateMagLeegWachtwoord(): void
    {
        $r = Validator::gebruiker(
            ['voornaam' => 'A', 'achternaam' => 'B', 'inlognaam' => 'ab', 'rol_ids' => [1, 2]],
            false,
        );
        self::assertSame('', $r['wachtwoord']);
        self::assertSame([1, 2], $r['rol_ids']);
    }

    public function testGebruikerRolIdsMoetenGetallenZijn(): void
    {
        $this->assertOngeldig(fn () => Validator::gebruiker(
            ['inlognaam' => 'ab', 'wachtwoord' => 'x', 'rol_ids' => ['nope']],
            true,
        ));
    }

    // ── configuratie ───────────────────────────────────────────────────────────
    public function testConfiguratieWaardeVerplicht(): void
    {
        self::assertSame(['waarde' => '15'], Validator::configuratie(['waarde' => '15']));
        $this->assertOngeldig(fn () => Validator::configuratie(['waarde' => '   ']));
    }
}
