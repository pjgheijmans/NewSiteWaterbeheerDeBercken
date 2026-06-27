<?php

declare(strict_types=1);

namespace Zwembad\Support;

/**
 * Bepaal de weer te geven auteursnaam voor een ingelogde gebruiker — port van
 * backend/auteur.ts. Valt terug van "voornaam achternaam" → inlognaam → gebruikersnaam.
 */
final class Auteur
{
    /** @param array<string,mixed> $g */
    public static function bepaal(array $g): string
    {
        $delen = array_filter(
            [$g['voornaam'] ?? null, $g['achternaam'] ?? null],
            static fn ($n): bool => is_string($n) && $n !== '',
        );
        $naam = trim(implode(' ', $delen));

        return $naam !== ''
            ? $naam
            : (string) (($g['inlognaam'] ?? '') ?: ($g['gebruikersnaam'] ?? ''));
    }
}
