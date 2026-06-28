<?php

declare(strict_types=1);

namespace Zwembad\Support;

/**
 * Wachtwoord-hashing met PHP's ingebouwde password_hash/password_verify.
 *
 * Bewust PASSWORD_DEFAULT (= bcrypt): dat is op ELKE PHP-build aanwezig, ook op
 * gedeelde hosting. Argon2id vereist een PHP die daarmee gecompileerd is en is
 * daar niet gegarandeerd — daarom hier niet gebruikt.
 *
 * Anders dan de Node-backend (scrypt met eigen opslagformaat) hoeven we geen
 * bestaande hashes te bewaren: de database is nieuw. De plaintext-tak in
 * `verifieer()` bestaat alleen om de seed-accounts uit init.sql (die nog platte
 * wachtwoorden bevatten) te laten inloggen; bij die eerste login worden ze
 * gehasht. Zodra alle accounts gehasht zijn, kan die tak weg.
 */
final class Wachtwoord
{
    public static function hash(string $plain): string
    {
        return password_hash($plain, PASSWORD_DEFAULT);
    }

    public static function isGehasht(?string $opgeslagen): bool
    {
        // Een geldige hash levert info; platte tekst niet.
        return is_string($opgeslagen) && password_get_info($opgeslagen)['algo'] !== null
            && password_get_info($opgeslagen)['algo'] !== 0;
    }

    public static function verifieer(string $plain, ?string $opgeslagen): bool
    {
        if ($opgeslagen === null || $opgeslagen === '') {
            return false;
        }
        if (!self::isGehasht($opgeslagen)) {
            return hash_equals($opgeslagen, $plain); // legacy plaintext (seed-accounts)
        }
        return password_verify($plain, $opgeslagen);
    }
}
