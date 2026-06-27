<?php

declare(strict_types=1);

namespace Zwembad\Support;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Historie-recht: poort van de datum-/historielogica in backend/middleware/auth.ts.
 * Vandaag (en de toekomst) mag altijd; een datum in het verleden alleen met het
 * historie-recht. YYYY-MM-DD vergelijkt lexicografisch gelijk aan chronologisch.
 */
final class Historie
{
    /** Huidige kalenderdag (Europe/Amsterdam) als YYYY-MM-DD. */
    public static function vandaagAmsterdam(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('Europe/Amsterdam')))->format('Y-m-d');
    }

    /** @param array<string,mixed>|null $gebruiker */
    public static function magHistorie(?array $gebruiker): bool
    {
        return !empty($gebruiker['magHistorie']);
    }

    /** @param array<string,mixed>|null $gebruiker */
    public static function magDatumBewerken(string $datum, ?array $gebruiker): bool
    {
        return $datum >= self::vandaagAmsterdam() || self::magHistorie($gebruiker);
    }
}
